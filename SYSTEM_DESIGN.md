# System Design of Hhousing

A teaching walkthrough of the architecture this product actually uses — not a generic template.

This file has two jobs:

1. **Demonstration** — document the real design of this repo so a new engineer (or future you) can see why the pieces exist.
2. **Teaching** — introduce the system-design ideas those pieces implement, with the vocabulary you will meet in interviews and in production.

Read it top to bottom once. After that, use the table of contents as a map: each section names a choice, explains the concept, then points at the code.

---

## Table of contents

1. [How to think about system design](#1-how-to-think-about-system-design)
2. [The problem this system solves](#2-the-problem-this-system-solves)
3. [The one-page architecture](#3-the-one-page-architecture)
4. [Who talks to whom (clients and trust boundaries)](#4-who-talks-to-whom-clients-and-trust-boundaries)
5. [Monorepo and layered packages](#5-monorepo-and-layered-packages)
6. [Multi-tenancy: organization as the isolation unit](#6-multi-tenancy-organization-as-the-isolation-unit)
7. [The domain model (entities and workflows)](#7-the-domain-model-entities-and-workflows)
8. [Authentication vs authorization](#8-authentication-vs-authorization)
9. [The API: a Backend-for-Frontend](#9-the-api-a-backend-for-frontend)
10. [PostgreSQL as the source of truth](#10-postgresql-as-the-source-of-truth)
11. [Row Level Security as defense in depth](#11-row-level-security-as-defense-in-depth)
12. [Money: ledger, invoices, and payments](#12-money-ledger-invoices-and-payments)
13. [Mobile money: webhooks, idempotency, and eventual consistency](#13-mobile-money-webhooks-idempotency-and-eventual-consistency)
14. [Background jobs and cron](#14-background-jobs-and-cron)
15. [Notifications](#15-notifications)
16. [Observability, analytics, and support](#16-observability-analytics-and-support)
17. [What we deliberately did not build](#17-what-we-deliberately-did-not-build)
18. [How this maps to classic interview topics](#18-how-this-maps-to-classic-interview-topics)
19. [A learning path through this repo](#19-a-learning-path-through-this-repo)

---

## 1. How to think about system design

System design is the practice of answering three questions before writing clever code:

1. **What is the product boundary?** Who are the users, what must the system never get wrong, and what can be slow or incomplete?
2. **Where does trust live?** Which process is allowed to change money, roles, or leases — and which clients are untrusted?
3. **What fails independently?** If the payment provider is down, can tenants still see their lease? If the mobile app is offline, does the ledger stay consistent?

A useful design is not “the most scalable architecture.” It is the smallest architecture that protects the invariants of *this* product, while leaving a path to grow.

Throughout this file, every choice is framed as a **tradeoff**: what we gained, what we gave up, and what we would revisit if the load or the product changed.

### A vocabulary cheat sheet

| Term | Meaning in this app |
|---|---|
| **Invariant** | A rule that must stay true even if the UI crashes. Example: a security deposit is never posted as rent revenue. |
| **Trust boundary** | A line between untrusted clients (browser, phone) and trusted server code. The client never writes the database. |
| **Source of truth** | The place you consult when two screens disagree. For money, that is the finance ledger, not a cached dashboard number. |
| **Multi-tenancy** | Many organizations share one app and one database. Isolation is by `organization_id`, not by spinning up a database per customer. |
| **BFF (Backend for Frontend)** | One API shaped for our own clients, not a public third-party API. `web-manager` hosts that API; the tenant app calls `/api/mobile/*`. |
| **Idempotency** | Doing the same payment callback twice must not mark rent paid twice. |
| **Defense in depth** | Two independent locks for the same door: application authorization *and* Postgres Row Level Security. |
| **Eventual consistency** | A tenant taps “pay”; the ledger updates only after PawaPay’s webhook (or a later status poll) confirms success. |

---

## 2. The problem this system solves

**Hhousing** is an operations-first property management SaaS for the DRC (French-first UX, Mobile Money payments, local operating constraints). Inspiration is products like TenantCloud — end-to-end rental operations — not a listings marketplace.

Four kinds of people use it, on purpose-built surfaces:

| Person | Surface | What they are allowed to do |
|---|---|---|
| **Tenant** | Expo mobile app (`apps/mobile-tenant`) | See their own lease, pay rent (when enabled), view building services. Never the operator web app. |
| **Landlord / property manager** | Next.js web app (`apps/web-manager`) | Operate properties, units, tenants, leases, invoices, maintenance, documents, team. |
| **Property owner (investor)** | `/owner-portal` inside the same web app | Read-only performance: occupancy, income, statements. Cannot operate. |
| **Platform admin** | `/admin` inside the same web app | Cross-organization SaaS ops: users, orgs, suspend, billing. Not a separate deploy. |

The **core data backbone** every feature must strengthen:

Organization → Property → Unit → Lease (tenant ↔ unit) → Payment / Invoice / Ledger → Maintenance → Conversation → Document → Service provider.

If a feature does not serve one of those entities or their workflows, it is not a priority. That is a design choice: **constrain the domain so the architecture stays coherent.**

Canonical product source: [`project-context.md`](./project-context.md).

---

## 3. The one-page architecture

```text
┌─────────────────────┐     ┌──────────────────────────────────────────────┐
│  Tenant phone       │     │  Operator / owner / admin browser            │
│  Expo (React Native)│     │  Next.js App Router (web-manager)            │
│  Bearer JWT         │     │  Cookie session (Supabase SSR)               │
└──────────┬──────────┘     └────────────────────┬─────────────────────────┘
           │  HTTPS /api/mobile/*                 │  RSC + /api/*
           ▼                                      ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                     Next.js server (the BFF)                             │
│  middleware → session resolve → Zod validate → application services      │
│  Authorization lives here. Clients never hold a database password.       │
└──────────┬───────────────────────────────────────────────┬───────────────┘
           │ pg (service / pooled)                         │ Supabase Auth
           ▼                                               ▼
┌─────────────────────────────┐              ┌─────────────────────────────┐
│  PostgreSQL (Supabase)      │              │  Supabase Auth              │
│  orgs, leases, ledger, RLS  │◄─────────────│  users, sessions, JWT       │
└──────────┬──────────────────┘              └─────────────────────────────┘
           │
           │  outbound HTTPS
           ▼
┌──────────────┐  ┌─────────────┐  ┌──────────┐  ┌─────────────┐
│  PawaPay     │  │  WhatsApp   │  │ PostHog  │  │  Tawk.to    │
│  (payments)  │  │  (messages) │  │ (product)│  │  (support)  │
└──────┬───────┘  └─────────────┘  └──────────┘  └─────────────┘
       │ signed webhooks back into /api/webhooks/pawapay/*
       ▼
    same Next.js server, no user session — signature is the auth
```

**Teaching point — draw the boxes first.** In interviews, start with clients, the API, the database, and third parties. Only then drill into tables and classes. This diagram is the “level 1” answer; the rest of the file is “level 2.”

---

## 4. Who talks to whom (clients and trust boundaries)

### Choice: three *logical* products, one *deployed* operator app

ADR-001 originally imagined separate admin and user apps. The product later collapsed **operator, owner portal, and platform admin** into `apps/web-manager`, with **tenants exclusively on mobile**.

Why that is a good system-design move at this stage:

- One Next.js deploy, one set of env vars, one cron host, one API for mobile.
- Role routing happens in **middleware**, not in three codebases that would drift.
- Tenants never receive a web dashboard, so the operator UI can be dense and French-desktop-oriented without compromising the tenant experience.

The unused `apps/web-admin` stub is a reminder that **architecture documents lag reality**. When you design, prefer the running code and `project-context.md` over an old ADR if they disagree. ADRs record *a decision at a time*; they are not automatically current.

### Choice: tenants authenticate with a Bearer token; operators with cookies

| Client | Credential | Why |
|---|---|---|
| Mobile | `Authorization: Bearer <supabase access token>` | Native apps do not have a first-party cookie jar the way a same-site browser does. Tokens are attached by `apps/mobile-tenant/src/lib/api-client.ts`. |
| Web | HttpOnly cookies via `@supabase/ssr` | Browser XSS cannot easily steal the session if it is not in `localStorage`. Middleware refreshes the session on each navigation. |

Same identity provider (Supabase Auth). Different **session transport**. That split is a classic BFF pattern: one identity system, many client constraints.

### Choice: the mobile app does not talk to Postgres

The Expo app has a **publishable** Supabase key for login only. All business data goes through `EXPO_PUBLIC_API_BASE_URL` → `https://www.harakaproperty.com/api/mobile/...`.

This is the most important trust-boundary rule in the repo:

> No database or privileged service calls from client/UI code.

If the phone is rooted, the JWT leaked, or a future intern adds a “quick Supabase select,” RLS is the backstop — but the **intended** design is: the server is the only writer.

---

## 5. Monorepo and layered packages

The workspace is a **pnpm monorepo**:

```text
apps/web-manager      presentation + HTTP + application services
apps/mobile-tenant    presentation only (calls the BFF)
packages/domain       types + pure functions (no Next, no pg, no Supabase)
packages/api-contracts  DTOs, Zod schemas, ApiResult<T>
packages/data-access  Postgres repositories
packages/ui           shared UI (limited)
packages/config       shared config
db/migrations         SQL source of truth for schema
```

### Teaching: layered architecture

A layer may depend **downward**, never upward:

```text
UI / route handlers
        ↓
application services  (apps/web-manager/src/api/*)
        ↓
api-contracts         (shapes crossing the HTTP boundary)
        ↓
domain                (rules that would still be true on paper)
        ↓
data-access           (SQL)
        ↓
PostgreSQL
```

**Why this exists:** rent proration, lease status, and “is this user an operator?” should not be copy-pasted into a React component and a cron job. The domain package is where **framework-free rules** live. Example: `packages/domain/src/proration/calculate-monthly-proration.ts` is a pure function. Move-in and move-out both import it. That is how you keep two features from inventing two different definitions of “half a month of rent.”

### Choice: TypeScript strict, `any` banned, Zod at the edge

- **Compile time** catches internal contract drift (a field renamed in domain but not in the UI).
- **Zod at API boundaries** catches *external* input (mobile JSON, webhook payloads, form posts). Never trust a client-shaped object.

This is **input validation**, not authorization. Validation answers “is this JSON the shape we expect?” Authorization answers “may *this user* do it?” You need both.

### Choice: a single `ApiResult<T>` envelope

```ts
type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; code: string; error: string };
```

Every async server response uses this. Clients never receive a raw Postgres error. `code` maps to HTTP status in route handlers (`UNAUTHORIZED` → 401, `FORBIDDEN` → 403, `VALIDATION_ERROR` → 400).

**Tradeoff:** slightly more boilerplate than throwing exceptions. **Gain:** mobile and web can branch on `success` without parsing message strings; production errors stay generic (“Generation failed”) while development can be verbose.

### Honest drift from ADR-001

The first ADR said “PostgreSQL via Prisma.” The running system uses **`pg` (node-postgres)** and hand-written SQL in `packages/data-access` plus `db/migrations`. That is not a failure; it is a later optimization:

- Full control of pool settings for **Supabase transaction pooler** (port 6543).
- Migrations as reviewable SQL (no generated Prisma migration surprises).
- Repositories stay explicit about which columns they touch.

If you are learning ORMs: Prisma would have been a fine start. This codebase shows the “raw SQL + repository” style, which is common once query shape and connection pooling matter.

---

## 6. Multi-tenancy: organization as the isolation unit

**SaaS multi-tenancy** means many customers share one application. The isolation unit here is **Organization**, not “one Postgres database per landlord.”

Almost every operational table carries `organization_id` with a foreign key and a supporting index. Queries in repositories are scoped by that id. Membership records in `organization_memberships` bind a Supabase `auth.users` id to exactly **one role per organization**.

```text
                    ┌──────────── organization ────────────┐
auth.users ─── membership (role + capabilities)            │
                    │  properties → units → leases         │
                    │  tenants, payments, ledger, docs     │
                    └──────────────────────────────────────┘

platform_admins  (no org)     →  /admin
owner_portal_accesses         →  /owner-portal  (read-only slice of an org)
marketplace profiles          →  listing seeker, not an operator
```

### Why shared-database, shared-schema (not database-per-tenant)

| Approach | When it wins | Why we did not pick it yet |
|---|---|---|
| **Shared DB, `organization_id` column** (this app) | Fast to ship, one migration story, cheap for hundreds/thousands of orgs | Must never forget `organization_id` in a query |
| Database per tenant | Strong isolation, custom schema per customer, noisy-neighbor protection | Operational cost explodes; overkill before product-market fit |
| Schema per tenant | Middle ground in Postgres | Painful migrations; still overkill here |

**The rule you must remember:** a missing `organization_id` filter is a **data leak**, not a style issue. Application services take `organizationId` from the **resolved session**, not from an optional client field the user can spoof.

### Two layers of suspend

- **Account-level:** `platform_user_statuses` — a suspended user gets no session on any surface.
- **Org-level:** `organizations.status = suspended` — operators of only-suspended orgs cannot obtain an operator session.

Platform admins are *not* org members. Their source of truth is `platform_admins`. Mixing “God mode” into `organization_memberships` would blur the tenant isolation model.

---

## 7. The domain model (entities and workflows)

Think in **workflows**, not screens. Screens change; invariants should not.

### Renting (happy path)

```text
Manager creates org → property → units
        → invites tenant → tenant accepts (mobile)
        → lease + charge schedule
        → monthly cron generates charges/invoices
        → tenant pays (or manager records payment)
        → ledger + payment status update
        → operator dashboard and owner portal reflect the same ledger
```

### Maintenance (designed, currently deferred on mobile)

```text
Tenant request → manager inbox → assign prestataire → status timeline → resolved
```

The data model still exists (`maintenance_requests`). The current tenant *release* hides it — a product slice, not a schema rollback. That is a useful distinction: **shipping a smaller client does not mean deleting the domain.**

### Move-out

Move-out is a **state machine** with a deterministic close:

- Inspection, charges, deposit disposition.
- Closure snapshot is taken from ledger rows up to a specific `closure_ledger_event_id` (not “everything before 5pm”).
- Snapshot is immutable after close.

**Teaching: identify source-of-truth vs projection.** The lease “balance due” on a dashboard is a *projection*. The ledger rows are the source. If they disagree, the ledger wins and the projection is rebuilt. See [`docs/context/finance-controls.md`](./docs/context/finance-controls.md).

---

## 8. Authentication vs authorization

These are different systems. Confusing them is the most common junior design error.

| | Authentication (AuthN) | Authorization (AuthZ) |
|---|---|---|
| Question | Who is this? | What may they do? |
| Provider | Supabase Auth (email/password, phone/password on mobile) | Our Postgres tables |
| Artifact | JWT / cookie session | `organization_memberships.role`, capabilities, `platform_admins`, team function permissions |

### Choice: roles live in the database, not in JWT `user_metadata`

Supabase lets you stuff a role into `user_metadata`. That metadata is **user-editable** in some flows and can appear in `auth.jwt()`. Using it for authorization would let a tenant claim `landlord`.

This app’s rule (also a Supabase security best practice):

- Identity: `auth.users.id`
- Org role: `organization_memberships`
- Platform admin: `platform_admins`
- Team permissions: application-level functions (`LEASING_AGENT`, `ACCOUNTANT`, …) **on top of** the DB role `property_manager`, not new DB roles for every job title

Session resolution is centralized in `apps/web-manager/src/auth/resolve-session.ts`:

1. If the user is suspended → no session.
2. If they are an active platform admin → `role: "platform_admin"`, `organizationId: null`.
3. Else load memberships; drop those whose org is suspended; pick a primary membership.
4. Else marketplace profile → `marketplace_user`.
5. Else null (onboarding / account-type picker).

`requireOperatorSession`, `requireTenantSession`, and `requirePlatformAdminSession` in `apps/web-manager/src/api/shared.ts` then **narrow the TypeScript type**. A tenant token cannot type-check its way into an operator handler.

### Choice: one role per org

A user who is a tenant in org A cannot also be a manager in org A without a different membership model. Joining a second org is an explicit invite/re-signup path. That simplifies authorization code: you do not evaluate a list of conflicting roles for the same org on every request.

### Choice: UX personalization is not security

The signup “I manage my own rentals vs I manage for others” picker is **onboarding theater**. It is not stored as a security field. Security uses `role` + `can_own_properties`. Teaching: **never persist a marketing label and then authorize on it.**

### Middleware vs service checks

`apps/web-manager/src/middleware.ts` does **routing**: logged-in platform admin hitting `/login` goes to `/admin`; tenants never enter `/dashboard`. Middleware also attaches CORS for `/api/mobile`.

Middleware is a coarse filter. Every mutating API still calls `extractAuthSessionFromRequest` + `require*Session`. That duplication is intentional **defense in depth**: if middleware is bypassed (server action, cron-adjacent route, future mobile webview), the handler still refuses.

---

## 9. The API: a Backend-for-Frontend

There is no separate Nest/Express cluster. **Next.js App Router is the API server.**

```text
apps/web-manager/src/app/api/
  mobile/          tenant app
  webhooks/        PawaPay, WhatsApp (no user session)
  internal/        cron (CRON_SECRET bearer)
  owner-portal/    read-only owner APIs
  admin/           platform admin
  (resources)      properties, leases, payments, ...
```

### Teaching: BFF vs public API vs microservices

| Style | What it is | Why this app uses / avoids it |
|---|---|---|
| **BFF** | An API designed for *our* clients | Mobile and web share one Next deploy; routes are purpose-built (`/api/mobile/payments` vs operator `/api/payments`) |
| Public REST/GraphQL platform | Versioned for third parties | Not needed; there are no external developers yet |
| Microservices | Payments service, lease service, … | Would add network hops, distributed transactions, and ops cost before the domain is stable |

**When would we split?** If the payment webhook volume or a reporting warehouse needed independent scaling, you extract **that** slice — not all of them. Until then, modular *packages* inside one deploy give most of the clarity of services without the distributed-systems tax.

### Typical request path (tenant pays balance)

1. Mobile `api-client` attaches Bearer token.
2. `POST /api/mobile/payments/pay-balance`
3. `extractTenantSessionFromRequest` validates JWT with the **publishable** key (`getUser(jwt)` — never trust the JWT payload alone).
4. Handler reads JSON, passes **session-derived** `tenantAuthUserId` and `organizationId` into `initiateTenantBalanceDeposit`.
5. Application service validates provider + DRC phone, loads the current lease, opens a PawaPay deposit, stores a `pawapay_transactions` row.
6. Response is `ApiResult` with `transactionId` for the client to poll status.

The route file is thin. The **application function** is testable without HTTP. That is the “use-case / service” layer in classic clean architecture, sitting in `apps/web-manager/src/api/` because this BFF is the only runtime that needs it.

### Dependency injection without a framework

Services take a `deps` object of repository interfaces. Tests pass fakes; production routes call `createPaymentRepo()` which reads `DATABASE_URL`. You get testability without Nest-style DI containers.

---

## 10. PostgreSQL as the source of truth

Property operations are **relational**: a lease without a unit is meaningless; a payment without a lease is a bug. Postgres is the correct default.

### Schema conventions (worth copying in other projects)

From `db/migrations/0001_init_organizations_properties_units.sql` onward:

- **Text ids** (`prop_…` style from `createId`) rather than exposing sequential integers in URLs (harder to scrape; not a security boundary by itself).
- **Check constraints** for enums (`status in ('vacant', 'occupied', 'inactive')`) so illegal states cannot be stored even if application code has a bug.
- **Foreign keys with `on delete cascade`** where the child cannot exist without the parent (units die with a property).
- **Composite unique keys** (`unique (property_id, unit_number)`).
- **Indexes that match query patterns** `(organization_id, created_at desc)` — list pages are org-scoped and time-ordered.

### Connection pooling (a real production constraint)

`packages/data-access/src/pg-pool.ts` is a small file with a large lesson.

Supabase exposes a **transaction pooler** (Supavisor) on port 6543. Serverless/Next.js instances would otherwise open too many direct Postgres connections and hit the platform limit.

Choices encoded in the pool:

- Process-wide `Map` of pools keyed by connection string (Next.js hot reload must not leak pools).
- `max: 5` — each Next instance stays modest so many instances do not starve the pooler.
- Long `connectionTimeoutMillis` because cold TCP+auth to a remote pooler is slow; a short timeout looks like random 500s under dashboard concurrency.
- `statement_timeout=15s` as a backstop so one bad query cannot hold a backend forever.

**Teaching: connection pooling is part of system design**, not an afterthought. “We use Postgres” is incomplete until you say *how many connections, from how many app instances, through which pooler mode.*

### Migrations as the contract

Schema change = a new file in `db/migrations/`. That is the audit trail. Application code and domain types follow. Never “fix it in production with a console UPDATE” as the design.

---

## 11. Row Level Security as defense in depth

Supabase exposes a Data API on the `public` schema. Even though our apps are supposed to use the server + `pg`, a leaked publishable key plus a table without RLS is a breach.

The strategy that evolved in migrations:

1. Enable RLS on operational tables.
2. **Permissive SELECT** for `authenticated` members of the org (`organization_id in (select user_org_ids())`).
3. **No write policies for the authenticated role** — default deny. Writes go through the server connection that bypasses RLS (privileged role).
4. Dropped earlier “restrictive deny_all” policies (`0044_drop_global_deny_rls_policies.sql`) because RLS already denies when no policy matches; duplicate deny policies were noise.

```text
Client (anon / authenticated)  →  PostgREST  →  RLS  →  SELECT own org, no writes
Next.js server (privileged pg) →  repositories  →  application AuthZ  →  reads/writes
```

**Teaching:** RLS is not a substitute for application authorization. It is the **second lock** for the Data API and for any future client that accidentally queries Supabase directly. Application AuthZ still decides “may this manager assign this unit,” which RLS org-scoping alone cannot express (same org, wrong permission).

Also: `user_org_ids()` is `security definer` with a fixed `search_path`. That is required so the helper can read memberships without recursive RLS pain — and it is a loaded gun. Keep such functions small and in review.

---

## 12. Money: ledger, invoices, and payments

Finance is where system design stops being optional.

### Invariants (from finance-controls)

1. **The ledger is the only financial source of truth.**
2. Operational lease balances and financial account balances are *views* of that ledger.
3. Snapshots are immutable audit artifacts, never something you post new money from.
4. **A deposit is a liability movement, never operational revenue.**

The schema in `db/migrations/0035_finance_ledger_and_move_out_foundation.sql` encodes this in the database, not only in comments:

- Catalog tables: `finance_ledger_accounts`, `finance_ledger_categories` (allowed `entry_type`s, allowed accounts, deposit flag).
- `finance_ledger_entries` with a monotonic `ledger_event_id` (identity).
- A **trigger** `validate_finance_ledger_entry` that rejects illegal `(entry_type, category, account)` combinations.

**Teaching: put load-bearing rules in the database when a bug would mean real money.** Application validation is necessary; a trigger is the last line when two code paths disagree.

### Why a ledger instead of “update tenants.balance”

A single `balance` column is easy until you need:

- rent vs deposit vs damage vs refund,
- move-out settlement,
- owner statements,
- audit (“who posted this and why”),
- corrections without rewriting history.

A ledger is an **append-mostly** record. Voiding is a status (or a reversing entry), not a silent UPDATE of the past. That is the same idea as double-entry bookkeeping, simplified to the accounts this product needs (`tenant_receivable`, `deposit_liability`).

### Invoices vs payments vs ledger

These are different projections:

| Record | Role |
|---|---|
| Charge / invoice | “The tenant owes this for period X” (operational document) |
| Payment | “This collection happened” (or is pending/overdue) |
| Ledger entry | Accounting fact used for all reports and closures |

New finance routes must post through the finance posting path and must not write ledger-shaped data from a random UI handler.

---

## 13. Mobile money: webhooks, idempotency, and eventual consistency

PawaPay is an **external system of record for cash movement**. Our ledger is the system of record for *what that cash means* (which invoices it settles).

```text
Tenant taps Pay
    → we create pawapay_transactions (submitted)
    → PawaPay collects Mobile Money
    → PawaPay POST /api/webhooks/pawapay/deposits  (signed)
    → we verify signature on the raw body
    → if final success: complete allocation, mark payments, notify
    → if final failure: fail the transaction
    → if not final: 200 ignore (wait for the next callback)
```

### Trust: the webhook has no user JWT

Anyone on the internet can hit `/api/webhooks/...`. Auth is **HMAC/signature verification** of the raw body (`verifyPawapaySignedCallback`). Then we still **re-fetch status from PawaPay** for success paths rather than blindly trusting the payload. That is a standard payments pattern: treat the webhook as a *wake-up*, the provider API as confirmation.

### Idempotency

Webhooks retry. If we credited invoices on every delivery, tenants would overpay in our books. Completion functions must be safe to run twice for the same `depositId` (same row, already-final status → no-op).

**Teaching: name the idempotency key.** Here it is the PawaPay `depositId` / our `transactionId`. Store it uniquely. Branch on current status before mutating.

### Eventual consistency (what the tenant sees)

Between “I confirmed on my phone” and “the webhook arrived,” the UI may still show overdue. The mobile client therefore **polls** `/api/mobile/payments/pay-balance/[transactionId]/status`. That is a user-facing compensation for an async boundary.

This is not CAP-theorem hair-splitting. It is the everyday version: **you cannot have synchronous truth across two companies’ databases.** You design the wait.

### Feature flag

`EXPO_PUBLIC_MOBILE_PAYMENTS_ENABLED` defaults off until production PawaPay is ready. Design lesson: **hide the irreversible path** (moving real money) behind an explicit flag; keep the rest of the payments history UI shipping.

SaaS billing (platform invoices for landlords) is a *separate* money flow: usage-based, admin-confirmed, PawaPay for SaaS deferred. Do not conflate tenant rent rails with platform subscription rails — different payers, different failure modes, different ledgers.

---

## 14. Background jobs and cron

Vercel cron (`apps/web-manager/vercel.json`) hits internal routes with a shared secret:

| Schedule | Job | Why it is async |
|---|---|---|
| `5 0 1 * *` | Generate recurring rent charges | Calendar-period work; must not depend on a manager opening the app |
| `15 0 1 * *` | Generate SaaS invoices | Platform billing cycle |
| `20 3 * * *` | Finalize tenant account deletions | Legal/product delay; irreversible cleanup |

Auth: `Authorization: Bearer $CRON_SECRET`. Missing secret → 500 (misconfiguration). Wrong secret → 401.

Per-organization try/catch in charge generation: one org’s failure must not abort the whole platform run. That is **bulkhead isolation** at the loop level — a miniature version of the microservices idea, inside one process.

**Teaching: if a business event is “the first of the month,” it is a job, not a page load.** Dashboards display the result; they do not create it.

---

## 15. Notifications

`dispatchNotification` fans out to channels (email, WhatsApp) with per-channel skip/fail. Payment confirmation can notify without failing the payment if `failSilently` is set on a channel.

WhatsApp has its own webhook (`/api/webhooks/whatsapp`) and opt-in defaults — messaging is a **side effect**, not the ledger.

**Design rule:** money commits first; notifications are best-effort (or queued). Never wrap “send WhatsApp” in the same transaction as “mark invoice paid” unless you are willing to roll back cash-state because Meta was down.

---

## 16. Observability, analytics, and support

| Concern | Tool | Why it is not a custom module |
|---|---|---|
| Product analytics | PostHog | Funnel and feature usage; not a substitute for the finance ledger |
| Operator support | Tawk.to chat | Support tickets were added then **dropped** (`0058_drop_support_tickets.sql`). A full ticket product is a second SaaS. |
| Platform audit | `platform_audit_logs` / org `audit_logs` | Security-relevant actions (suspend, grant admin) must live in *our* DB |

**Teaching: buy commodity surfaces; build the domain.** Chat widgets and analytics are commodity. Org isolation, leases, and ledgers are not.

---

## 17. What we deliberately did not build

Good system design is mostly **saying no** so the invariants stay reviewable.

| Deferred / rejected | Reason |
|---|---|
| Separate `web-admin` deploy | Same users, same auth, extra ops |
| Microservices | Domain still changing; distributed transactions for leases+payments would hurt |
| Prisma | Pooling and SQL control mattered more than ORM speed |
| Listing marketplace as the core product | Operations SaaS first; marketplace is adjacent |
| In-app support tickets | Use Tawk.to; tickets are a product, not a checkbox |
| Live PawaPay for SaaS invoices | Tenant rent rails first; admin confirms platform payments |
| Hard lock for unpaid SaaS | Soft overdue banner until policy and payments are proven |
| Tenant maintenance/messages in the current mobile release | Shrink the client blast radius; keep server domain |
| JWT roles | User-editable metadata is not an authorization store |
| Client-side database writes | Trust boundary |

ADR-001’s layered model, strict TypeScript, Zod, and `ApiResult` **did** survive. That is the signal: constraints that protect correctness stick; folder names and ORMs may not.

---

## 18. How this maps to classic interview topics

If you are studying system design interviews, this codebase is a grounded example of several standard prompts.

### “Design a multi-tenant SaaS”

- Isolation key: `organization_id`
- Membership table as ACL
- Shared Postgres, RLS backup
- Platform admin as a *separate* principal, not a super-membership

### “Design a payments system”

- Provider (PawaPay) owns cash
- You own meaning (allocations, invoices, ledger)
- Webhook + signature + idempotency key
- Async UX (poll status)
- Cron for recurring charges

### “Design a marketplace” (partial)

Listings and applications exist, plus marketplace seeker sessions. The product **refuses** to let marketplace growth work outrank operations. In an interview, saying “we explicitly deprioritize X because the source of truth is Y” is a senior move.

### CAP, consistency, and this app

You do not need to chant CAP. You do need to say:

- **Within our Postgres transaction:** strong consistency for a lease close or a ledger post.
- **Across PawaPay and us:** eventual consistency with an idempotent reconciler.
- **Availability:** if PawaPay is down, browsing leases still works; paying does not. That is an acceptable degraded mode.

### Scale — the honest version

This system is designed for **correct rental operations for DRC property managers**, not for Twitter-scale fanout.

What *is* already scale-aware:

- indexes on org-scoped list queries,
- connection pool limits,
- cron that isolates per-org failures,
- serverless-friendly BFF (no sticky in-memory jobs).

What you would add only with evidence:

- read replicas / warehouse for heavy owner reports,
- a queue (SQS, pg-boss) if webhooks or WhatsApp sending become slow,
- Redis for session or dashboard caches **after** measuring,
- splitting the worker from the web process when cron + request latency collide.

**Do not add a queue because a blog post has one.** Add it when a webhook handler times out or a notification blast blocks a user request.

---

## 19. A learning path through this repo

Work through these files in order. Each one teaches a concept with running code.

1. **Product invariants** — [`project-context.md`](./project-context.md), [`docs/context/roles-and-auth.md`](./docs/context/roles-and-auth.md)
2. **Packages** — `packages/domain/src/index.ts`, then one entity file (e.g. `lease.types.ts`)
3. **Pure domain rule** — `packages/domain/src/proration/calculate-monthly-proration.ts`
4. **HTTP envelope** — `packages/api-contracts/src/api-result.types.ts`, `packages/api-contracts/src/auth.types.ts`
5. **Session resolution** — `apps/web-manager/src/auth/resolve-session.ts`, `apps/web-manager/src/api/shared.ts`
6. **Thin route + fat service** — `apps/web-manager/src/app/api/mobile/payments/pay-balance/route.ts` → `initiate-tenant-balance-deposit.ts`
7. **Webhook** — `apps/web-manager/src/app/api/webhooks/pawapay/deposits/route.ts` → `process-pawapay-deposit-callback.ts`
8. **Schema + trigger** — `db/migrations/0001_*.sql`, `0035_finance_ledger_*.sql`
9. **RLS** — `db/migrations/0042_*.sql`, `0044_*.sql`
10. **Pooling** — `packages/data-access/src/pg-pool.ts`
11. **Jobs** — `apps/web-manager/vercel.json`, `apps/web-manager/src/app/api/internal/payments/generate-recurring/route.ts`
12. **Mobile trust** — `apps/mobile-tenant/src/lib/api-client.ts`, `apps/mobile-tenant/README.md`

When you add a feature, ask the same questions this design already answered:

1. Which core entity does this strengthen?
2. Who is the principal, and which `require*Session` applies?
3. What is the source of truth if two screens disagree?
4. What happens if this request runs twice?
5. What happens if the third party is down?

If you can answer those five, you are doing system design — not just drawing boxes.

---

## Appendix: repository map

| Path | Responsibility |
|---|---|
| `apps/web-manager` | Operator/owner/admin UI + BFF + crons + webhooks |
| `apps/mobile-tenant` | Tenant client (Mon Espace) |
| `apps/web-admin` | Unused stub; do not extend |
| `packages/domain` | Framework-free types and calculations |
| `packages/api-contracts` | Zod + DTO + `ApiResult` |
| `packages/data-access` | `pg` repositories |
| `db/migrations` | Schema history |
| `docs/decisions` | ADRs (historical decisions) |
| `docs/context` | Product/auth/finance modules |
| `project-updates.md` | Append-only change log |

---

*This document describes the architecture as implemented in this repository. If code and this file disagree, the code and `project-context.md` win — then update this file.*
