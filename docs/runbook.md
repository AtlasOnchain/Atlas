# Atlas Runbook

## What Atlas Is For

Atlas helps the operator decide whether capital flow is still early, propagating, or already too crowded to matter.

## Daily Operator Loop

1. Run `bun run dev`.
2. Read the flow map and alert output for the leading wallet move.
3. Check propagation lag, sector overlap, and crowding together.
4. Escalate only the moves where the graph still looks early enough to matter.

## What Gets Promoted

- clear origin wallets
- second-wave follow-through inside the lag window
- low crowding with coherent sector overlap

## What Gets Demoted

- copied moves arriving too late
- crowded follower clusters
- sector noise that does not look like real propagation
