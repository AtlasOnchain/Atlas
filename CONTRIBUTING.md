# Contributing

## Local Setup

```bash
bun install
cp .env.example .env
bun run dev
```

## Contribution Rules

- keep wallet-source changes separate from propagation logic
- update tests when alert states or propagation scoring change
- prefer dashboard-style visuals over noisy graph concepts

## Pull Request Notes

- explain which propagation or crowding rule changed
- include a sample alert when interpretation behavior changes
- update the runbook if the operator flow changed
