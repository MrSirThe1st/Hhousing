# Project Charter (Non-Negotiables)

## Product Scope

Single-app or multi-app product with one or more of:
- User-facing web app
- Admin or operations web app
- Mobile app
- Backend service/API

## Engineering Principles

1. Correctness before convenience.
2. Shared domain logic over duplicated app logic.
3. Strong type safety end to end.
4. Security by default, not by review.
5. Explicit boundaries over implicit coupling.

## Mandatory Rules

1. TypeScript strict mode everywhere.
2. No `any` in application code.
3. Validate all input at API boundaries.
4. Authorize all protected operations in server code.
5. No DB or service role calls in client code.
6. No unauthorized cross-boundary imports (including cross-app imports in monorepos).
7. All async errors return structured responses.
8. Every feature includes tests for happy path + failure path.
9. Consult `project-updates.md` before searching wider project context.
10. Maintain `project-updates.md` for all meaningful DB, API, structure, and logic changes.
11. All new backend contracts must use shared schemas and typed result objects.
12. Prefer reuse of existing components, utilities, and contracts over duplication.
13. Challenge directions that are weak for scalability, security, performance, or maintainability.

## Approval Required Before Execution

Approval is required before:
1. Database schema changes or migrations.
2. Infrastructure or environment configuration changes.
3. Authentication or authorization behavior changes.
4. Package installs, removals, or major version upgrades.
5. Large refactors or folder structure changes.
6. Any major deviation from agreed architecture or operating rules.

Approval is not required for:
1. Small isolated code fixes.
2. Tests.
3. Documentation updates.
4. Non-breaking internal refactors inside an approved scope.

## Definition Of Done

A change is done only when:
1. Architecture boundary checks pass.
2. Lint, typecheck, tests pass locally and in CI.
3. Security checks pass (dependency and basic static checks).
4. PR checklist completed.
5. Logging and error handling included for new server paths.
6. `project-updates.md` is updated when the change is meaningful.

## Error Contract

Use a consistent shape:

```ts
export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code: string };
```

## Data Access Contract

- UI talks to typed API/service layer only.
- API/service layer talks to repositories/adapters.
- Repositories/adapters talk to Supabase/Prisma.
- Never bypass the layer sequence.

## Documentation Contract

- `project-updates.md` is the first project memory source to consult.
- Append only meaningful changes; avoid trivial churn entries.
- Each entry includes date, change type, and concise description.
- Testing gaps that are deferred must be recorded there or in the PR checklist, not as inline TODO comments.
