export type WalletLabel = "vc" | "whale" | "protocol" | "dex" | "cex" | "unknown";
export type WalletAction =
  | "accumulating"
  | "distributing"
  | "farming"
  | "bridging"
  | "swapping"
  | "staking"
  | "unknown";

export interface TrackedWallet {
  address: string;
  label: WalletLabel;
  name: string;
  tags: string[];
}

export interface TokenMove {
  mint: string;
  symbol: string;
  amount: number;
  direction: "in" | "out";
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
  estimatedUsd: number;
  rationale: string;
  confidence: number;
  generatedAt: number;
}
