import type { WalletActivity, TokenMove, WalletLabel, Sector } from "./types.js";
import { config, HELIUS_BASE } from "./config.js";

interface HeliusTx {
  signature: string;
  timestamp: number;
  nativeTransfers: Array<{ fromUserAccount: string; toUserAccount: string; amount: number }>;
  tokenTransfers: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    mint: string;
    tokenAmount: number;
    symbol?: string;
  }>;
}

function inferSector(symbol: string): Sector {
  const upper = symbol.toUpperCase();
  if (["BONK", "WIF", "POPCAT", "PENGU"].includes(upper)) return "meme";
  if (["JTO", "JUP", "PYTH"].includes(upper)) return "infra";
  if (["SOL", "mSOL", "jitoSOL"].includes(upper)) return "staking";
  if (["USDC", "USDT"].includes(upper)) return "stable-yield";
  return "unknown";
}

export async function fetchWalletActivity(
  address: string,
  name: string,
  label: WalletLabel,
): Promise<WalletActivity> {
  const url = `${HELIUS_BASE}/addresses/${address}/transactions?api-key=${config.HELIUS_API_KEY}&limit=${config.MAX_TXS_PER_WALLET}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Helius ${res.status} for ${address}`);
  const txs = (await res.json()) as HeliusTx[];

  let netSolChangeLamports = 0;
  const mintTotals = new Map<string, { symbol: string; net: number; sector: Sector }>();

  for (const tx of txs) {
    for (const transfer of tx.nativeTransfers) {
      if (transfer.toUserAccount === address) netSolChangeLamports += transfer.amount;
      if (transfer.fromUserAccount === address) netSolChangeLamports -= transfer.amount;
    }

    for (const transfer of tx.tokenTransfers) {
      const symbol = transfer.symbol ?? transfer.mint.slice(0, 6);
      const existing = mintTotals.get(transfer.mint) ?? {
        symbol,
        net: 0,
        sector: inferSector(symbol),
      };
      if (transfer.toUserAccount === address) existing.net += transfer.tokenAmount;
      if (transfer.fromUserAccount === address) existing.net -= transfer.tokenAmount;
      mintTotals.set(transfer.mint, existing);
    }
  }

  const topMoves: TokenMove[] = Array.from(mintTotals.entries())
    .filter(([, value]) => Math.abs(value.net) > 0)
    .sort((a, b) => Math.abs(b[1].net) - Math.abs(a[1].net))
    .slice(0, 5)
    .map(([mint, value]) => ({
      mint,
      symbol: value.symbol,
      amount: Math.abs(value.net),
      direction: value.net > 0 ? "in" : "out",
      sector: value.sector,
    }));

  return {
    address,
    name,
    label,
    txCount: txs.length,
    netSolChangeLamports,
    topMoves,
    lastSeenAt: txs[0]?.timestamp ?? 0,
    rawTxs: txs,
  };
}
