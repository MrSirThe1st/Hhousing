# Quality Gates

## Run Before PR
```
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Minimum Test Coverage
- New API route: test success, validation failure, and auth failure.
- New business logic: test happy path + at least one failure.

## PR Blocked If
- Any command above fails
- Unvalidated external input
- Missing auth check on protected route
- `any` introduced in non-trivial code
