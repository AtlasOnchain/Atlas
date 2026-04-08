<div align="center">

# Atlas

**Solana capital-flow mapper.**
Tracks origin wallets, follower propagation, and sector rotation across the on-chain graph.

[![Build](https://img.shields.io/github/actions/workflow/status/AtlasOnchain/Atlas/ci.yml?branch=main&style=flat-square&label=Build)](https://github.com/AtlasOnchain/Atlas/actions)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)
[![Built with Claude Agent SDK](https://img.shields.io/badge/Built%20with-Claude%20Agent%20SDK-7c3aed?style=flat-square)](https://docs.anthropic.com/en/docs/agents-and-tools/claude-agent-sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square)](https://www.typescriptlang.org/)

</div>

---

The edge in wallet intelligence is not seeing that a large wallet moved. It is knowing whether that wallet was first, whether others are copying it, and whether capital is rotating across sectors or simply shuffling inside the same bucket.

`Atlas` tracks a curated wallet set, fetches recent Helius activity, infers sector exposure from token movement, and asks a Claude agent to emit capital-flow alerts framed around origin, propagation, and distribution.
The emphasis is on who led the flow and whether the rest of the graph is still early or already crowded.

`SCAN -> MAP MOVES -> INFER SECTOR -> SCORE PROPAGATION -> ALERT`

---

## Flow Map

![Atlas Wallets](assets/preview-wallets.svg)

---

## Flow Alert

![Atlas Alert](assets/preview-alert.svg)

---

## Technical Spec

Atlas treats a wallet move as a network event, not an isolated transfer.

Core propagation logic:

`PropagationScore = lagAdjustedFollowRate * sizeSimilarity * sectorOverlap`

Operationally:

- origin wallets matter more than follower wallets
- sector overlap matters because meme rotations behave differently from staking or infra rotations
- follower saturation decays the value of a copied signal once too many second-wave wallets pile in
- late propagation should be demoted if lag exceeds the configured window

The alert payload explicitly includes:

- `action`: originating, propagating, rotating, distributing
- `sector`: meme, infra, staking, stable-yield, or unknown
- `propagationScore`: bounded confidence about whether the move is leading or following the graph

---

## Quick Start

```bash
git clone https://github.com/AtlasOnchain/Atlas
cd Atlas && bun install
cp .env.example .env
bun run dev
```

---

## Configuration

```bash
ANTHROPIC_API_KEY=sk-ant-...
HELIUS_API_KEY=...
ALERT_MIN_CONFIDENCE=0.70
MIN_PROPAGATION_LAG_SECONDS=15
MAX_PROPAGATION_LAG_SECONDS=300
COPY_SATURATION_THRESHOLD=0.55
```

---

## Legitimacy Notes

- Planned commit sequence: [`docs/commit-sequence.md`](docs/commit-sequence.md)
- Draft engineering issues: [`docs/issue-drafts.md`](docs/issue-drafts.md)

---

## License

MIT

---

*map who moved first, not just who moved big.*
