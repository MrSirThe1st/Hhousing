# Architecture Map

## Top-Level Context

- `apps/web-user`: customer-facing Next.js app
- `apps/web-admin`: operations/admin Next.js app
- `apps/mobile`: Expo app
- `packages/domain`: business logic and policies
- `packages/api-contracts`: shared DTOs, schemas, result types
- `packages/data-access`: Supabase and Prisma adapters
- `packages/state`: shared Zustand patterns and stores (where appropriate)
- `packages/ui`: shared design system primitives
- `packages/config-*`: lint, tsconfig, test, build configs

## Layered Model

1. Presentation: Next.js pages/components, Expo screens
2. Application: use cases and orchestration services
3. Domain: entities, invariants, business rules
4. Infrastructure: DB adapters, external services

Dependency direction must only flow downward.

## Domain Modules (initial suggestion)

- Identity and access
- Catalog or core resources
- Transactions and lifecycle workflows
- Users, roles, and ownership
- Payments and billing
- Support or service requests
- Notifications
- Reporting

## Runtime Ownership

- Auth/session: Supabase Auth
- Relational data: PostgreSQL via Prisma
- Realtime and storage where needed: Supabase
- Caching: app-level and server-level, only behind typed interfaces

## Critical Rule

Shared domain behaviors must live in `packages/domain` and never be duplicated in app folders.
