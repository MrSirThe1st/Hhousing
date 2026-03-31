# Hhousing Agent Rules

## Product Scope
Core entities: Organization, Property, Unit, Lease, Tenant, Payment, Maintenance, Conversation, Document.
- Owner scope → read-only. Admin scope → cross-organization.
- Defer or reject listing-only work that doesn't advance operations.

## Before Every Task
1. Read `project-updates.md` first.
2. If the task is ambiguous or touches schema, auth, packages, or large refactors → ask before proceeding.

## Standards (always enforced)
- TypeScript strict — `any` banned in non-trivial code
- Validate all external input at API boundaries with Zod
- Auth check on every protected server operation
- Return `ApiResult<T>` — never raw DB or provider errors
- No DB or privileged service calls from client/UI code
- Reuse existing types, components, and logic before creating new
```ts
type ApiResult<T> = { success: true; data: T } | { success: false; error: string };
```

## Workflow
1. Read `project-updates.md` + relevant files.
2. Implement the smallest working slice.
3. Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
4. Append to `project-updates.md` if the change is meaningful.

## PR is blocked if
- Any check above fails
- Unvalidated external input exists
- A protected route lacks an auth check
- `any` is introduced in non-trivial code

## Minimum Test Coverage
- New API route: success, validation failure, auth failure
- New business logic: happy path + at least one failure path

## Delivery Priority
1. Onboarding (org → property → unit → invite tenant)
2. Rent flow (invoice → payment → ledger/status)
3. Maintenance flow (request → assignment → resolution)
4. Messaging and document continuity
5. Owner read-only views
6. Admin org and plan controls

## project-updates.md Format
Append-only. One entry per meaningful change. Keep entries concise.
```
## YYYY-MM-DD
- Type: DB | API | Frontend | Mobile | Infra | Other
- Description: what changed
- Impact: tables, routes, contracts, folders affected
- Tests: added | updated | deferred (reason)
```