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

const JUPITER_PRICE_API = "https://price.jup.ag/v6/price";
const STABLE_PRICES: Record<string, { priceUsd: number; symbol: string }> = {
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: { priceUsd: 1, symbol: "USDC" },
  Es9vMFrzaCERmJfrF4H2FYyM2q6x1r7Di5ur7KbyN1Ns: { priceUsd: 1, symbol: "USDT" },
};

function inferSector(symbol: string): Sector {
  const upper = symbol.toUpperCase();
  if (["BONK", "WIF", "POPCAT", "PENGU"].includes(upper)) return "meme";
  if (["JTO", "JUP", "PYTH"].includes(upper)) return "infra";
  if (["SOL", "mSOL", "jitoSOL"].includes(upper)) return "staking";
  if (["USDC", "USDT"].includes(upper)) return "stable-yield";
  return "unknown";
}

async function fetchMintQuotes(mints: string[]): Promise<Map<string, { priceUsd: number; symbol: string }>> {
  const quotes = new Map<string, { priceUsd: number; symbol: string }>();
  const unique = [...new Set(mints)].filter(Boolean);

  for (const mint of unique) {
    if (STABLE_PRICES[mint]) quotes.set(mint, STABLE_PRICES[mint]);
  }

  const unresolved = unique.filter((mint) => !quotes.has(mint));
  if (unresolved.length === 0) return quotes;

  try {
    const res = await fetch(`${JUPITER_PRICE_API}?ids=${encodeURIComponent(unresolved.join(","))}`);
    if (!res.ok) return quotes;

    const data = await res.json() as { data?: Record<string, { price?: number; mintSymbol?: string }> };
    for (const mint of unresolved) {
      const item = data.data?.[mint];
      if (!item?.price) continue;
      quotes.set(mint, { priceUsd: item.price, symbol: item.mintSymbol ?? mint.slice(0, 6) });
    }
  } catch {
    return quotes;
  }

  return quotes;
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
  const quotes = await fetchMintQuotes(txs.flatMap((tx) => tx.tokenTransfers.map((transfer) => transfer.mint)));

  let netSolChangeLamports = 0;
  const mintTotals = new Map<string, { symbol: string; net: number; estimatedUsd: number; sector: Sector }>();

  for (const tx of txs) {
    for (const transfer of tx.nativeTransfers) {
      if (transfer.toUserAccount === address) netSolChangeLamports += transfer.amount;
      if (transfer.fromUserAccount === address) netSolChangeLamports -= transfer.amount;
    }

    for (const transfer of tx.tokenTransfers) {
      const quote = quotes.get(transfer.mint);
      const symbol = transfer.symbol ?? quote?.symbol ?? transfer.mint.slice(0, 6);
      const existing = mintTotals.get(transfer.mint) ?? {
        symbol,
        net: 0,
        estimatedUsd: 0,
        sector: inferSector(symbol),
      };
      const estimatedUsd = transfer.tokenAmount * (quote?.priceUsd ?? 0);
      if (transfer.toUserAccount === address) {
        existing.net += transfer.tokenAmount;
        existing.estimatedUsd += estimatedUsd;
      }
      if (transfer.fromUserAccount === address) {
        existing.net -= transfer.tokenAmount;
        existing.estimatedUsd -= estimatedUsd;
      }
      mintTotals.set(transfer.mint, existing);
    }
  }

  const topMoves: TokenMove[] = Array.from(mintTotals.entries())
    .filter(([, value]) => Math.abs(value.estimatedUsd) > 0 || Math.abs(value.net) > 0)
    .sort((a, b) => Math.abs(b[1].estimatedUsd) - Math.abs(a[1].estimatedUsd))
    .slice(0, 5)
    .map(([mint, value]) => ({
      mint,
      symbol: value.symbol,
      amount: Math.abs(value.net),
      estimatedUsd: Math.abs(Number(value.estimatedUsd.toFixed(2))),
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
