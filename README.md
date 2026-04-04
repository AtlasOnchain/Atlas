<div align="center">

# Atlas

**Smart money tracker for Solana.**
Watches whale wallets, VC funds, and protocol treasuries. Alerts you the moment they make a significant move.

[![Build](https://img.shields.io/github/actions/workflow/status/AtlasOnchain/Atlas/ci.yml?branch=main&style=flat-square&label=Build)](https://github.com/AtlasOnchain/Atlas/actions)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)
[![Built with Claude Agent SDK](https://img.shields.io/badge/Built%20with-Claude%20Agent%20SDK-7c3aed?style=flat-square)](https://docs.anthropic.com/en/docs/agents-and-tools/claude-agent-sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square)](https://www.typescriptlang.org/)

</div>

---

Smart money moves first. A tier-1 VC quietly accumulating JTO across 8 transactions is a signal most people miss — Atlas doesn't.

`Atlas` tracks a curated registry of known whale wallets, VC funds, and protocol treasuries via the Helius Enhanced Transactions API. Every minute, it scans recent activity, identifies significant moves, and uses Claude to classify the behavior: accumulating, distributing, farming, bridging. High-confidence alerts fire immediately.

```
SCAN → CLASSIFY → CORRELATE → ALERT
```

---

## Wallet Dashboard

![Atlas Wallets](assets/preview-wallets.svg)

---

## Smart Money Alert

![Atlas Alert](assets/preview-alert.svg)

---

## Architecture

```
┌──────────────────────────────────────────┐
│          Wallet Registry                  │
│  Known VCs · Whales · Protocol Wallets   │
│  + custom wallets via SEED_WALLETS       │
└────────────────┬─────────────────────────┘
                 ▼
┌──────────────────────────────────────────┐
│       Helius Enhanced Transactions        │
│  Recent txns · token transfers · SOL     │
│  net flows · source classification       │
└────────────────┬─────────────────────────┘
                 ▼
┌──────────────────────────────────────────┐
│         Claude Atlas Agent               │
│  get_batch_overview → get_wallet_detail  │
│  → find_correlated_moves → emit_alert   │
└────────────────┬─────────────────────────┘
                 ▼
┌──────────────────────────────────────────┐
│           Alert Tracker                   │
│  Confidence filter · session history     │
│  Token lookup · action statistics        │
└──────────────────────────────────────────┘
```

---

## Alert Types

| Action | Signal | Example |
|--------|--------|---------|
| **accumulating** | Bullish | VC buying JTO over multiple txns |
| **distributing** | Bearish | Whale dumping position after 3x |
| **farming** | Neutral/Positive | Protocol deploying into Kamino |
| **bridging** | Watch | Large cross-chain move |
| **staking** | Long-term bullish | Locking SOL with validators |

---

## Built-in Tracked Wallets

| Name | Label | Tags |
|------|-------|------|
| Multicoin Capital | VC | tier1-vc, solana-ecosystem |
| Jito Foundation | Protocol | lsd, solana-native |
| SOL Whale #1 | Whale | early-adopter |
| Alameda Legacy | VC | historical, large-portfolio |

Add more via `src/wallets.ts` or `SEED_WALLETS` env var.

---

## Quick Start

```bash
git clone https://github.com/AtlasOnchain/Atlas
cd Atlas && bun install
cp .env.example .env
# add ANTHROPIC_API_KEY and HELIUS_API_KEY
bun run dev
```

---

## Configuration

```bash
ANTHROPIC_API_KEY=sk-ant-...
HELIUS_API_KEY=...              # helius.xyz — free tier available
SEED_WALLETS=addr1,addr2        # extra wallets to track
MIN_TRANSFER_SOL=100            # minimum move size to analyze
ALERT_MIN_CONFIDENCE=0.70       # skip low-confidence alerts
SCAN_INTERVAL_MS=60000          # scan every minute
```

---

## License

MIT

---

*know what the whales know.*
