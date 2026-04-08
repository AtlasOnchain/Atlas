# Atlas Issue Drafts

## Aggregator wallets are still being mistaken for true origin nodes

Some high-volume routes are just settlement hubs. We need a pass that demotes wallets whose follow graph is mostly routing noise rather than directional timing edge.

## Copy saturation should decay propagation score faster once a move becomes crowded

The current propagation score stays too high even after second-wave wallets flood a sector. Add a stronger saturation decay term so late copy signals fall out sooner.

Backlog note: replay both issues on infra and meme rotation days before tightening the propagation thresholds.
