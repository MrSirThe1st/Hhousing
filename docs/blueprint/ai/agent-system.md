# AI Rules

## Product Scope Guardrail
- Prefer features tied to core entities: Organization, Property, Unit, Lease, Tenant, Payment, Maintenance Request, Conversation, Document.
- Reject or defer listing-centric work that does not advance property operations.
- Keep owner scope read-only and keep admin scope cross-organization.

## Before Starting
1. Check `project-updates.md`.
2. Ask if task is ambiguous or approval-required (schema, auth, packages, big refactors).

## Always
- TypeScript strict, no `any`
- Validate external input with Zod
- Auth check on every protected server operation
- Return `{ success: false, error: string }` — never raw DB errors
- Test success + failure paths
- Reuse existing types and logic before creating new

## Never
- Call DB or privileged services from client/UI code
- Duplicate types that already exist
- Skip auth checks because the UI already checks

## Workflow
1. Check `project-updates.md` + relevant files.
2. Implement smallest working slice.
3. Run lint/typecheck/tests.
4. Update `project-updates.md` if change is meaningful.

## Workflow Priority Order
1. Onboarding flow (org -> property -> unit -> invite tenant).
2. Rent flow (invoice -> payment -> ledger/status updates).
3. Maintenance flow (request -> assignment -> resolution updates).
4. Messaging and document continuity.
