# CI Policy

## Pipeline Stages

1. Setup: install, cache, lockfile validation
2. Static: lint, typecheck, boundary lint
3. Test: unit/integration, critical e2e smoke
4. Build: all apps and shared packages
5. Security: dependency audit + secrets scan baseline

## Failure Policy

- Any failed required stage blocks merge.
- Flaky tests must be fixed or quarantined with owner and expiry date.

## Branch Protection

- Require PR review
- Require all checks passing
- Block force-push on protected branches

## Ownership

- Each gate has a clear owner team.
- Gate changes require ADR update.
