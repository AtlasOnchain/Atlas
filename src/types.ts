export type WalletLabel = "vc" | "whale" | "protocol" | "dex" | "cex" | "unknown";
export type WalletAction = "originating" | "propagating" | "distributing" | "rotating" | "staking" | "unknown";
export type Sector = "meme" | "ai" | "infra" | "staking" | "stable-yield" | "unknown";

export interface TrackedWallet {
  address: string;
  label: WalletLabel;
  name: string;
  tags: string[];
  sectorBias?: Sector;
}

export interface TokenMove {
  mint: string;
  symbol: string;
  amount: number;
  estimatedUsd: number;
  direction: "in" | "out";
  sector: Sector;
}

export interface WalletActivity {
  address: string;
  name: string;
  label: WalletLabel;
  txCount: number;
  netSolChangeLamports: number;
  topMoves: TokenMove[];
  lastSeenAt: number;
  rawTxs: unknown[];
}

export interface SmartMoneyAlert {
  id: string;
  walletAddress: string;
  walletName: string;
  walletLabel: WalletLabel;
  action: WalletAction;
  tokens: string[];
  sector: Sector;
  estimatedUsd: number;
  propagationScore: number;
  rationale: string;
  confidence: number;
  generatedAt: number;
}
