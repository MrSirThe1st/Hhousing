# Dependency Boundaries

## Allowed Imports

- `apps/*` -> `packages/*`
- `packages/application` -> `packages/domain`, `packages/api-contracts`
- `packages/data-access` -> `packages/domain`, `packages/api-contracts`
- `packages/ui` -> internal UI deps only

## Forbidden Imports

- `apps/*` -> `apps/*`
- `packages/domain` -> framework packages (next, expo, react-native)
- `packages/domain` -> DB clients (prisma, supabase-js)
- `packages/api-contracts` -> runtime framework dependencies

## Boundary Enforcement

Use ESLint import rules and path groups to enforce boundaries.

Example rule intent:
- reject app-to-app imports
- reject framework imports in domain package
- reject infra imports from UI packages

## Package Responsibilities

- `domain`: pure business logic and invariants
- `api-contracts`: zod schemas, shared result and DTO types
- `data-access`: repository implementations and external clients
- `ui`: reusable components and tokens
- `state`: Zustand slices and selectors patterns

## Anti-Patterns

- Feature logic in page components
- Business rules in Zustand stores
- Raw SQL or direct Supabase calls in route handlers without repository layer
- Copy-pasted types across apps
