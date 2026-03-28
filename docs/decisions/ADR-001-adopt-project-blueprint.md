# ADR-001: Adopt Project Blueprint and Monorepo Architecture

- Status: Accepted
- Date: 2026-03-28
- Owners: Admin (platform owner)

## Context

Hhousing is starting from scratch. Without upfront architectural constraints, the codebase risks:

- Duplicated business logic spread across apps
- No consistent error handling or API contracts
- Framework code leaking into domain logic (untestable, tightly coupled)
- Authorization gaps from ad-hoc per-route checks
- Type unsafety from permissive TypeScript usage

A structured blueprint with explicit rules, package boundaries, and operating conventions is needed before any code is written.

## Decision

Adopt the Hhousing project blueprint as the single source of architectural truth. This includes:

1. **Monorepo structure** — `apps/web-user`, `apps/web-admin`, `apps/mobile` + `packages/domain`, `packages/api-contracts`, `packages/data-access`, `packages/ui`, `packages/state`, `packages/config-*`
2. **Layered dependency model** — Presentation → Application → Domain → Infrastructure; no upward imports
3. **TypeScript strict mode everywhere** — `any` banned in application code
4. **Supabase Auth** for session management
5. **PostgreSQL via Prisma** for relational data; Supabase for realtime/storage
6. **Zod** for all input validation at API boundaries
7. **Shared `ApiResult<T>` error contract** for all async server responses
8. **ESLint import rules** to enforce boundary violations at CI time
9. **`project-updates.md`** as first project memory source before codebase search
10. **`project-context.md`** as authoritative product/domain reference

## Consequences

- Positive:
  - Clear ownership boundaries eliminate duplicate logic
  - Strict TS + Zod catches contract violations at compile time
  - Security by default: authorization always in server code
  - Onboarding is faster with explicit conventions documented
- Negative:
  - Initial setup overhead for monorepo tooling and ESLint boundary rules
  - Requires discipline to keep domain package framework-free
- Neutral:
  - All new features must be planned against this map before implementation

## Alternatives Considered

1. **Plain single Next.js app** — Simpler to start, but no mobile app separation and no clean domain layer; becomes hard to maintain as features grow
2. **Custom ad-hoc structure per feature** — Maximum short-term speed, but leads to inconsistent patterns, duplicated types, and authorization gaps

## Rollout Plan

- Step 1: Establish `project-context.md` and this ADR as Phase 1 foundation documents
- Step 2: Scaffold monorepo folder structure with `packages/*` and `apps/*` (Phase 2)
- Step 3: Configure ESLint boundary rules and TypeScript project references (Phase 2)
- Step 4: All subsequent features follow the layered model enforced by CI

## Validation

- ESLint import rule violations fail CI
- TypeScript strict mode errors fail CI
- `project-context.md` matches accepted product definition
- ADR reviewed and accepted before any scaffolding begins
