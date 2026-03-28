# Quality Gates

## Local Required Commands

All contributors (human or AI-assisted) must run:
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

## CI Required Gates

1. Install + lockfile integrity check
2. Lint
3. Typecheck
4. Unit/integration tests
5. Build all deployable targets
6. Dependency vulnerability scan
7. Changed-files boundary lint

## Gate Policy

- No merge on red checks.
- No bypass for feature branches.
- Emergency bypass requires documented incident and follow-up fix PR.

## Minimum Test Expectations

- Domain modules: high unit coverage for business invariants.
- API routes/services: success + validation failure + auth failure paths.
- Critical user flows: e2e smoke tests for login, primary listing/detail flow, payment intent, and support request flow.

## Review Quality Bar

A PR is rejected if it contains:
- Unvalidated external input
- Authorization gaps
- `any`-based shortcuts
- Cross-boundary imports
- Missing failure-path tests for new server behavior
