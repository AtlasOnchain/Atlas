import type { TrackedWallet } from "./types.js";
import { config } from "./config.js";

export const KNOWN_WALLETS: TrackedWallet[] = [
  {
    address: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    label: "vc",
    name: "Multicoin Capital",
    tags: ["tier1-vc", "solana-ecosystem"],
  },
  {
    address: "Ciu2BHH6AjqkQ3F1CJNiRqyRFVGZ7J6MrxpEgqcVYPW",
    label: "whale",
    name: "SOL Whale #1",
    tags: ["early-adopter"],
  },
  {
    address: "7uTJHNiuH4S9W4gDoGYGLTbFFuUoxcPNfxWy4scJkqqR",
    label: "vc",
    name: "Alameda Legacy",
    tags: ["historical", "large-portfolio"],
  },
  {
    address: "DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh",
    label: "protocol",
    name: "Jito Foundation",
    tags: ["solana-native", "lsd"],
  },
  {
    address: "Bf5JKMbhkMHzPkAbsNmBKkZkLMXWeSBiSzqCcv4q8FdN",
    label: "whale",
    name: "Anonymous Whale #2",
    tags: ["defi-heavy"],
  },
];

const customWallets: TrackedWallet[] = [];

export function getAllWallets(): TrackedWallet[] {
  const seedAddresses = config.SEED_WALLETS
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const seedWallets: TrackedWallet[] = seedAddresses.map((address) => ({
    address,
    label: "unknown" as const,
    name: `Custom: ${address.slice(0, 8)}`,
    tags: ["user-added"],
  }));

  return [...KNOWN_WALLETS, ...customWallets, ...seedWallets];
}

export function addWallet(wallet: TrackedWallet): void {
  customWallets.push(wallet);
}

export function findWallet(address: string): TrackedWallet | undefined {
  return getAllWallets().find((w) => w.address === address);
}
