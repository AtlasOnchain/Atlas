import { describe, it, expect } from "vitest";
import type { SmartMoneyAlert } from "../src/types.js";
import { deriveObservedAlertUsd } from "../src/agent/loop.js";

function makeAlert(overrides: Partial<SmartMoneyAlert> = {}): SmartMoneyAlert {
  return {
    id: crypto.randomUUID(),
    walletAddress: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    walletName: "Test VC",
    walletLabel: "vc",
    action: "originating",
    tokens: ["JTO"],
    sector: "infra",
    estimatedUsd: 50_000,
    propagationScore: 0.74,
    rationale: "Wallet entered before the follower cluster",
    confidence: 0.85,
    generatedAt: Date.now(),
    ...overrides,
  };
}

describe("wallet registry", () => {
  it("known wallets have required fields", async () => {
    const { KNOWN_WALLETS } = await import("../src/wallets.js");
    for (const wallet of KNOWN_WALLETS) {
      expect(wallet.address).toBeTypeOf("string");
      expect(wallet.address.length).toBeGreaterThan(30);
      expect(wallet.name.length).toBeGreaterThan(0);
    }
  });
});

describe("alert model", () => {
  it("propagation score is bounded", () => {
    const alert = makeAlert();
    expect(alert.propagationScore).toBeGreaterThanOrEqual(0);
    expect(alert.propagationScore).toBeLessThanOrEqual(1);
  });

  it("sector is included", () => {
    expect(makeAlert().sector).toBe("infra");
  });

  it("action remains explicit in the alert payload", () => {
    expect(makeAlert().action).toBe("originating");
  });
});

describe("alert notional reconciliation", () => {
  it("derives alert usd from observed matching wallet moves", () => {
    const observed = deriveObservedAlertUsd(
      {
        address: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        name: "Test VC",
        label: "vc",
        txCount: 3,
        netSolChangeLamports: 0,
        topMoves: [
          { mint: "mint1", symbol: "JTO", amount: 1200, estimatedUsd: 42000, direction: "in", sector: "infra" },
          { mint: "mint2", symbol: "PYTH", amount: 900, estimatedUsd: 8000, direction: "in", sector: "infra" },
        ],
        lastSeenAt: Date.now(),
        rawTxs: [],
      },
      ["JTO"],
    );
    expect(observed).toBe(42000);
  });
});
