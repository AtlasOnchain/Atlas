import Anthropic from "@anthropic-ai/sdk";
import type { WalletActivity, SmartMoneyAlert, WalletAction, WalletLabel, Sector } from "../types.js";
import { ATLAS_SYSTEM } from "./prompts.js";
import { config } from "../config.js";
import { log } from "../logger.js";
import crypto from "crypto";

const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

export function deriveObservedAlertUsd(wallet: WalletActivity | undefined, tokens: string[]): number {
  if (!wallet) return 0;
  const requested = new Set(tokens.map((token) => token.toUpperCase()));
  const observedUsd = wallet.topMoves
    .filter((move) => requested.has(move.symbol.toUpperCase()))
    .reduce((sum, move) => sum + move.estimatedUsd, 0);
  if (observedUsd > 0) return Number(observedUsd.toFixed(2));
  return Number((wallet.topMoves[0]?.estimatedUsd ?? 0).toFixed(2));
}

const tools: Anthropic.Tool[] = [
  {
    name: "get_batch_overview",
    description: "Overview of all wallets scanned this cycle with sector and top-move context",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "get_wallet_detail",
    description: "Deep detail for a specific wallet address",
    input_schema: {
      type: "object" as const,
      properties: {
        address: { type: "string", description: "Wallet address" },
      },
      required: ["address"],
    },
  },
  {
    name: "find_correlated_moves",
    description: "Find all wallets that moved the same token this cycle",
    input_schema: {
      type: "object" as const,
      properties: {
        token_symbol: { type: "string" },
      },
      required: ["token_symbol"],
    },
  },
  {
    name: "emit_alert",
    description: "Emit a capital-flow alert for a significant wallet action",
    input_schema: {
      type: "object" as const,
      properties: {
        wallet_address: { type: "string" },
        wallet_name: { type: "string" },
        wallet_label: { type: "string", enum: ["vc", "whale", "protocol", "dex", "cex", "unknown"] },
        action: {
          type: "string",
          enum: ["originating", "propagating", "distributing", "rotating", "staking", "unknown"],
        },
        tokens: { type: "array", items: { type: "string" } },
        sector: { type: "string", enum: ["meme", "ai", "infra", "staking", "stable-yield", "unknown"] },
        estimated_usd: { type: "number" },
        propagation_score: { type: "number" },
        rationale: { type: "string" },
        confidence: { type: "number" },
      },
      required: ["wallet_address", "wallet_name", "wallet_label", "action", "tokens", "sector", "estimated_usd", "propagation_score", "rationale", "confidence"],
    },
  },
];

export async function runAtlasAgent(batch: WalletActivity[]): Promise<SmartMoneyAlert[]> {
  const alerts: SmartMoneyAlert[] = [];
  const byAddress = new Map(batch.map((wallet) => [wallet.address, wallet]));

  const tokenCorrelations = new Map<string, string[]>();
  for (const wallet of batch) {
    for (const move of wallet.topMoves) {
      const key = move.symbol.toUpperCase();
      const list = tokenCorrelations.get(key) ?? [];
      list.push(wallet.name);
      tokenCorrelations.set(key, list);
    }
  }

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Scan complete. ${batch.length} wallets checked. Analyze the activity and emit capital-flow alerts for meaningful origin, propagation, or rotation events.`,
    },
  ];

  for (let turn = 0; turn < 12; turn++) {
    const response = await client.messages.create({
      model: config.CLAUDE_MODEL,
      max_tokens: 4096,
      system: ATLAS_SYSTEM,
      tools,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") break;
    if (response.stop_reason !== "tool_use") break;

    const results: Anthropic.ToolResultBlockParam[] = [];

    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      const input = block.input as Record<string, unknown>;
      let result = "";

      if (block.name === "get_batch_overview") {
        result = JSON.stringify(
          batch.map((wallet) => ({
            name: wallet.name,
            label: wallet.label,
            txCount: wallet.txCount,
            netSolChange: (wallet.netSolChangeLamports / 1e9).toFixed(2) + " SOL",
            topToken: wallet.topMoves[0]
              ? `${wallet.topMoves[0].symbol} ${wallet.topMoves[0].direction} $${wallet.topMoves[0].estimatedUsd.toLocaleString()}`
              : "none",
            topSector: wallet.topMoves[0]?.sector ?? "unknown",
          })),
        );
      } else if (block.name === "get_wallet_detail") {
        const wallet = byAddress.get(input.address as string);
        result = wallet
          ? JSON.stringify({
              address: wallet.address,
              name: wallet.name,
              label: wallet.label,
              txCount: wallet.txCount,
              netSolChange: (wallet.netSolChangeLamports / 1e9).toFixed(2) + " SOL",
              topMoves: wallet.topMoves.map((move) => ({
                ...move,
                estimatedUsd: `$${move.estimatedUsd.toLocaleString()}`,
              })),
            })
          : "not found in this batch";
      } else if (block.name === "find_correlated_moves") {
        const symbol = (input.token_symbol as string).toUpperCase();
        const wallets = tokenCorrelations.get(symbol) ?? [];
        result = JSON.stringify({ token: symbol, movedByWallets: wallets, count: wallets.length });
      } else if (block.name === "emit_alert") {
        const wallet = byAddress.get(input.wallet_address as string);
        const alert: SmartMoneyAlert = {
          id: crypto.randomUUID(),
          walletAddress: input.wallet_address as string,
          walletName: input.wallet_name as string,
          walletLabel: input.wallet_label as WalletLabel,
          action: input.action as WalletAction,
          tokens: input.tokens as string[],
          sector: input.sector as Sector,
          estimatedUsd: deriveObservedAlertUsd(wallet, input.tokens as string[]),
          propagationScore: input.propagation_score as number,
          rationale: input.rationale as string,
          confidence: input.confidence as number,
          generatedAt: Date.now(),
        };
        if (alert.confidence >= config.ALERT_MIN_CONFIDENCE) {
          alerts.push(alert);
          log.info(`Alert: ${alert.walletName} ${alert.action} [${alert.tokens.join(",")}] propagation=${alert.propagationScore}`);
        }
        result = JSON.stringify({ accepted: alert.confidence >= config.ALERT_MIN_CONFIDENCE, id: alert.id });
      }

      results.push({ type: "tool_result", tool_use_id: block.id, content: result });
    }

    messages.push({ role: "user", content: results });
  }

  return alerts;
}
