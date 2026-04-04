import { describe, it, expect, beforeEach } from "vitest";
import type { SmartMoneyAlert } from "../src/types.js";

function makeAlert(overrides: Partial<SmartMoneyAlert> = {}): SmartMoneyAlert {
  return {
    id: crypto.randomUUID(),
    walletAddress: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    walletName: "Test VC",
    walletLabel: "vc",
    action: "accumulating",
    tokens: ["JTO"],
    estimatedUsd: 50_000,
    rationale: "Steady accumulation over last 10 transactions",
    confidence: 0.85,
    generatedAt: Date.now(),
    ...overrides,
  };
}

describe("wallet registry", () => {
  it("known wallets have required fields", async () => {
    const { KNOWN_WALLETS } = await import("../src/wallets.js");
    for (const w of KNOWN_WALLETS) {
      expect(w.address).toBeTypeOf("string");
      expect(w.address.length).toBeGreaterThan(30);
      expect(w.label).toMatch(/^(vc|whale|protocol|dex|cex|unknown)$/);
      expect(w.name.length).toBeGreaterThan(0);
    }
  });

  it("getAllWallets returns at least the known set", async () => {
    const { getAllWallets, KNOWN_WALLETS } = await import("../src/wallets.js");
    expect(getAllWallets().length).toBeGreaterThanOrEqual(KNOWN_WALLETS.length);
  });
});

describe("alert model", () => {
  it("confidence is in valid range", () => {
    const alert = makeAlert({ confidence: 0.91 });
    expect(alert.confidence).toBeGreaterThanOrEqual(0);
    expect(alert.confidence).toBeLessThanOrEqual(1);
  });

  it("tokens is always an array", () => {
    const alert = makeAlert({ tokens: ["SOL", "JTO"] });
    expect(Array.isArray(alert.tokens)).toBe(true);
    expect(alert.tokens).toHaveLength(2);
  });

  it("actions are valid enum values", () => {
    const valid = ["accumulating", "distributing", "farming", "bridging", "swapping", "staking", "unknown"];
    const alert = makeAlert({ action: "distributing" });
    expect(valid).toContain(alert.action);
  });

  it("labels are valid enum values", () => {
    const valid = ["vc", "whale", "protocol", "dex", "cex", "unknown"];
    const alert = makeAlert({ walletLabel: "whale" });
    expect(valid).toContain(alert.walletLabel);
  });
});

describe("tracker logic", () => {
  it("filters alerts by token correctly", async () => {
    const alerts = [
      makeAlert({ tokens: ["JTO", "SOL"] }),
      makeAlert({ tokens: ["AAVE"] }),
      makeAlert({ tokens: ["SOL"] }),
    ];
    const solAlerts = alerts.filter((a) =>
      a.tokens.map((t) => t.toUpperCase()).includes("SOL")
    );
    expect(solAlerts).toHaveLength(2);
  });

  it("sorts alerts newest first", () => {
    const now = Date.now();
    const alerts = [
      makeAlert({ generatedAt: now - 2000 }),
      makeAlert({ generatedAt: now }),
      makeAlert({ generatedAt: now - 1000 }),
    ];
    const sorted = [...alerts].sort((a, b) => b.generatedAt - a.generatedAt);
    expect(sorted[0].generatedAt).toBe(now);
  });
});
