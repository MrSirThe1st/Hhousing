# Project Charter

## Product Focus
1. Build operations-first property management SaaS.
2. Prioritize: Organization, Property, Unit, Lease, Tenant, Payment, Maintenance, Conversation, Document.
3. De-prioritize listing-only enhancements unless they unblock core operations.

## Rules
1. TypeScript strict, no `any`.
2. Validate all input at API boundaries (Zod).
3. Auth checks in server code — never client-only.
4. No direct DB calls from client/UI code.
5. All async errors return `{ success: false, error: string }`.
6. Reuse before duplicating — types, components, logic.
7. Check `project-updates.md` before exploring the codebase.

## Ask Before Doing
- DB schema changes or migrations
- Auth/authorization behavior changes
- Package installs or major upgrades
- Large refactors or folder structure changes

## Delivery Priority
1. Rent and payment reliability.
2. Maintenance lifecycle and notifications.
3. Tenant/manager messaging and document flows.
4. Owner read-only performance views.
5. Admin org and plan controls.

## Done When
- Lint, typecheck, tests pass
- PR checklist complete
- `project-updates.md` updated if change is meaningful

## Error Shape
```ts
type ApiResult<T> = { success: true; data: T } | { success: false; error: string };
```
