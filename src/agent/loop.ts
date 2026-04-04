import Anthropic from "@anthropic-ai/sdk";
import type { WalletActivity, SmartMoneyAlert, WalletAction, WalletLabel } from "../types.js";
import { ATLAS_SYSTEM } from "./prompts.js";
import { config } from "../config.js";
import { log } from "../logger.js";
import crypto from "crypto";

const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

const tools: Anthropic.Tool[] = [
  {
    name: "get_batch_overview",
    description: "Overview of all wallets scanned this cycle — active count, top movers, net SOL flows",
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
    description: "Find all wallets that moved the same token this cycle — multi-wallet correlation is a strong signal",
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
    description: "Emit a smart money alert for a significant wallet action",
    input_schema: {
      type: "object" as const,
      properties: {
        wallet_address: { type: "string" },
        wallet_name: { type: "string" },
        wallet_label: { type: "string", enum: ["vc", "whale", "protocol", "dex", "cex", "unknown"] },
        action: {
          type: "string",
          enum: ["accumulating", "distributing", "farming", "bridging", "swapping", "staking", "unknown"],
        },
        tokens: { type: "array", items: { type: "string" } },
        estimated_usd: { type: "number" },
        rationale: { type: "string" },
        confidence: { type: "number" },
      },
      required: ["wallet_address", "wallet_name", "wallet_label", "action", "tokens", "estimated_usd", "rationale", "confidence"],
    },
  },
];

export async function runAtlasAgent(batch: WalletActivity[]): Promise<SmartMoneyAlert[]> {
  const alerts: SmartMoneyAlert[] = [];
  const byAddress = new Map(batch.map((w) => [w.address, w]));

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
      content: `Scan complete. ${batch.length} wallets checked. Analyze the activity and emit alerts for significant smart money moves.`,
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
          batch.map((w) => ({
            name: w.name,
            label: w.label,
            txCount: w.txCount,
            netSolChange: (w.netSolChangeLamports / 1e9).toFixed(2) + " SOL",
            topToken: w.topMoves[0] ? `${w.topMoves[0].symbol} ${w.topMoves[0].direction}` : "none",
          }))
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
              topMoves: wallet.topMoves,
            })
          : "not found in this batch";
      } else if (block.name === "find_correlated_moves") {
        const sym = (input.token_symbol as string).toUpperCase();
        const wallets = tokenCorrelations.get(sym) ?? [];
        result = JSON.stringify({ token: sym, movedByWallets: wallets, count: wallets.length });
      } else if (block.name === "emit_alert") {
        const alert: SmartMoneyAlert = {
          id: crypto.randomUUID(),
          walletAddress: input.wallet_address as string,
          walletName: input.wallet_name as string,
          walletLabel: input.wallet_label as WalletLabel,
          action: input.action as WalletAction,
          tokens: input.tokens as string[],
          estimatedUsd: input.estimated_usd as number,
          rationale: input.rationale as string,
          confidence: input.confidence as number,
          generatedAt: Date.now(),
        };
        if (alert.confidence >= config.ALERT_MIN_CONFIDENCE) {
          alerts.push(alert);
          log.info(`Alert: ${alert.walletName} ${alert.action} [${alert.tokens.join(",")}] conf=${alert.confidence}`);
        }
        result = JSON.stringify({ accepted: alert.confidence >= config.ALERT_MIN_CONFIDENCE, id: alert.id });
      }

      results.push({ type: "tool_result", tool_use_id: block.id, content: result });
    }

    messages.push({ role: "user", content: results });
  }

  return alerts;
}
