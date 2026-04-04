import type { WalletActivity, TokenMove, WalletLabel } from "./types.js";
import { config, HELIUS_BASE } from "./config.js";

interface HeliusTx {
  signature: string;
  timestamp: number;
  type: string;
  source: string;
  nativeTransfers: Array<{ fromUserAccount: string; toUserAccount: string; amount: number }>;
  tokenTransfers: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    mint: string;
    tokenAmount: number;
    symbol?: string;
  }>;
}

export async function fetchWalletActivity(
  address: string,
  name: string,
  label: WalletLabel
): Promise<WalletActivity> {
  const url =
    `${HELIUS_BASE}/addresses/${address}/transactions` +
    `?api-key=${config.HELIUS_API_KEY}&limit=${config.MAX_TXS_PER_WALLET}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Helius ${res.status} for ${address}`);
  const txs: HeliusTx[] = await res.json() as HeliusTx[];

  let netSolChangeLamports = 0;
  const mintTotals = new Map<string, { symbol: string; net: number }>();

  for (const tx of txs) {
    for (const t of tx.nativeTransfers) {
      if (t.toUserAccount === address) netSolChangeLamports += t.amount;
      if (t.fromUserAccount === address) netSolChangeLamports -= t.amount;
    }
    for (const t of tx.tokenTransfers) {
      const existing = mintTotals.get(t.mint) ?? {
        symbol: t.symbol ?? t.mint.slice(0, 6),
        net: 0,
      };
      if (t.toUserAccount === address) existing.net += t.tokenAmount;
      if (t.fromUserAccount === address) existing.net -= t.tokenAmount;
      mintTotals.set(t.mint, existing);
    }
  }

  const topMoves: TokenMove[] = Array.from(mintTotals.entries())
    .filter(([, v]) => Math.abs(v.net) > 0)
    .sort((a, b) => Math.abs(b[1].net) - Math.abs(a[1].net))
    .slice(0, 5)
    .map(([mint, v]) => ({
      mint,
      symbol: v.symbol,
      amount: Math.abs(v.net),
      direction: v.net > 0 ? "in" : "out",
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
