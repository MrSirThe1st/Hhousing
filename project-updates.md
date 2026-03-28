# Project Updates

Use this file as the first project memory source before searching the codebase.

## Entry Rules

- Append only meaningful changes.
- Group related changes into one entry.
- Use concise, factual descriptions.
- Include DB, API, structure, and important logic decisions.
- Record deferred testing gaps when relevant.

## Template

## YYYY-MM-DD
- Change type: DB | API | Frontend | Mobile | Infra | Other
- Description: <what changed>
- Impact: <contracts, tables, routes, folders, logic>
- Tests: <added, updated, or deferred>

## Example

## 2026-03-28
- Change type: DB
- Description: Added `resources` table and linked media records.
- Impact: New resource creation flow uses shared DTOs and repository contracts.
- Tests: Added repository tests for create and duplicate-name failure.

---

## 2026-03-28
- Change type: Other
- Description: Imported project blueprint (charter, architecture map, dependency boundaries, quality gates, ADR template, AI agent system docs). Created `project-context.md` with product purpose, user types, workflows, glossary, non-goals, and fixed tech decisions. Added `docs/decisions/ADR-001-adopt-project-blueprint.md`.
- Impact: Establishes operating rules, monorepo structure conventions, error contracts, approval gates, and dependency boundary enforcement for all future work.
- Tests: N/A

---

## 2026-03-28
- Change type: Infra
- Description: Added root workspace scripts (`lint`, `typecheck`, `test`, `build`) in `package.json` and wired CI workflow at `.github/workflows/ci.yml` to run setup, lint, typecheck, test, and build gates on PRs and pushes to `main`/`develop`.
- Impact: Establishes baseline local quality commands and required CI gates aligned with blueprint quality policy.
- Tests: Deferred (no app/package test targets exist yet in this docs-only phase).

---

## 2026-03-28
- Change type: Infra
- Description: Bootstrapped runnable monorepo baseline with `apps/web-user` and `packages/domain` (TypeScript source, tests, package-level scripts), added pnpm workspace file, and root tooling configs for TS + ESLint.
- Impact: Repository now has minimal executable workspace targets so root `lint`, `typecheck`, `test`, and `build` commands run against real packages.
- Tests: Added minimal Vitest coverage in app and domain packages.

---

## 2026-03-28
- Change type: API
- Description: Implemented Phase 3 tiny vertical slice `create listing intent` with shared API contracts (`packages/api-contracts`), domain draft-creation rules (`packages/domain`), and app-layer use case with auth + boundary validation (`apps/web-user`).
- Impact: Added typed `ApiResult` contract, request parser, role-based authorization (`manager|owner|admin`), domain invariant checks, and exported slice entry points while preserving package boundaries.
- Tests: Added contracts validation tests, domain success/failure tests, and app use-case tests for auth, validation, and success paths.

---

## 2026-03-28
- Change type: API
- Description: Added Phase 4 application service and endpoint surface for listing-intent creation, introduced `packages/data-access` with an in-memory repository, and added public Supabase env parsing with `.env.example`.
- Impact: The web app now exposes a server-style `POST` handler module, the create-listing-intent flow persists through a repository interface, and future Supabase/Postgres integration has a dedicated data-access seam without crossing domain boundaries.
- Tests: Added repository tests, application service persistence/auth tests, endpoint status-mapping tests, and config-loader tests.

---

## 2026-03-28
- Change type: DB
- Description: Added Phase 5 SQL migration for `listing_intents`, implemented a Postgres-backed listing-intent repository in `packages/data-access`, and switched the default POST handler persistence path to env-driven database configuration via `DATABASE_URL`.
- Impact: Listing-intent creation now has a real database persistence seam and migration artifact, while app and domain layers remain unchanged behind the repository interface.
- Tests: Added database env-loader tests, Postgres repository mapping tests, updated handler tests for config-error behavior, and revalidated full workspace gates.

---

## 2026-03-28
- Change type: API
- Description: Added a Next-compatible route wrapper (`POST`) for listing-intent creation and an auth session extraction adapter based on request headers; added route-level end-to-end tests through the service and repository seam.
- Impact: Request handling now has a concrete route entry (`app/api/listings/intents/route.ts`) with JSON parsing + auth extraction before calling the existing handler/service path.
- Tests: Added session adapter tests and route tests; full lint/typecheck/test/build gates passed. Attempted local migration execution, but skipped because `DATABASE_URL` was not set in terminal environment.

---

## 2026-03-28
- Change type: API
- Description: Finalized the listing-intent slice by replacing header-trust auth with Supabase bearer-token session extraction, adding injectable route session extraction for tests, and exporting the updated route/session APIs.
- Impact: The route now authenticates from `Authorization: Bearer <jwt>` via Supabase user lookup and maps role metadata to platform roles, removing direct trust of client role headers.
- Tests: Updated auth and route tests for token-based extraction; full typecheck/test/build passed after adding `@supabase/supabase-js`. Migration apply attempt from `.env` failed in this environment due DNS resolution to Supabase DB host.

---

## 2026-03-28
- Change type: Frontend
- Description: Started platform UI build with a Next.js App Router shell in `apps/web-user`: added root layout, feed homepage with listing cards, create-listing page wired to POST `/api/listings/intents`, and listing detail route scaffold.
- Impact: The web app now has navigable user-facing pages and a functional form path to the existing listing-intent API slice, enabling real UI-driven testing of create flow.
- Tests: Existing route/service/auth tests retained; workspace gates re-run after dependency and TSX config updates.

---

## 2026-03-28
- Change type: API
- Description: Added read side for listing intents: new app services (`getListingIntents`, `getListingIntentById`), GET routes (`/api/listings/intents`, `/api/listings/intents/[id]`), shared read contracts, and repository list support in in-memory/Postgres adapters.
- Impact: Create+Read vertical slice is now live with auth-scoped listing retrieval for feed/detail surfaces and consistent typed API responses across packages.
- Tests: Added service tests and route tests for GET success/error paths, plus repository list tests; re-ran workspace `test`, `lint`, `typecheck`, and `build` successfully.

---

## 2026-03-28
- Change type: Frontend
- Description: Added list pagination and purpose/status filtering flow for listing-intent reads. GET list route now parses query params (`page`, `pageSize`, `purpose`, `status`), service applies scoped filters + pagination, and homepage uses search params to render filter + pagination controls.
- Impact: Feed moved from flat list retrieval to query-driven list reads with typed pagination metadata, enabling scalable browsing and consistent API behavior for future search/filter expansion.
- Tests: Added service and route tests for pagination/filter query handling; re-ran workspace `test`, `lint`, `typecheck`, and `build` successfully.

---

## 2026-03-28
- Change type: Frontend
- Description: Extended listing-intent read filters with `locationContains`, `minPriceUsd`, and `maxPriceUsd`; wired query parsing in GET route, service-level filtering, and homepage GET filter form that preserves filter state across pagination/purpose links.
- Impact: Users can now narrow feed results by location text and price range without leaving server-rendered flow, while API query semantics remain typed and backward-compatible.
- Tests: Added/updated service and route tests for location + price filters; re-ran workspace `test`, `lint`, `typecheck`, and `build` successfully.

---

## 2026-03-28
- Change type: Frontend
- Description: Closed the listing-intent read slice with typed sort support (`latest|priceAsc|priceDesc`) across contracts, route query parsing, service ordering, API client query generation, and homepage controls; added a `Clear filters` action and preserved sort state through pagination/filter links.
- Impact: Read surface now supports stable filtering + sorting + paging combinations in one server-rendered flow, making feed browsing production-ready for this slice.
- Tests: Added service and route tests for sort query handling; re-ran workspace `test`, `lint`, `typecheck`, and `build` successfully.

---

## 2026-03-28
- Change type: Frontend
- Description: Added Supabase browser-session auth flow for real-user UI usage (`/login`, header auth status, logout), switched create page to active session token, and restored missing feed/detail pages as session-backed client views consuming existing read APIs with filters/sort/pagination.
- Impact: Users can now log in and see real scoped listing data on feed and detail screens without manual bearer-token input; the accidental removal of root feed/detail page files was resolved.
- Tests: Re-ran full workspace gates (`test`, `typecheck`, `lint`, `build`) successfully after restoration.

---

## 2026-03-28
- Change type: API
- Description: Implemented listing-intent lifecycle + moderation foundations: expanded status model to `draft|submitted|approved|rejected`, added domain transition rules, repository `listAll` + `updateStatus`, review-scope list reads, and PATCH status endpoint with creator/reviewer authorization.
- Impact: API now supports owner submit-for-review and manager/admin approval queue semantics with shared contracts and DB migration (`0002_expand_listing_intent_statuses.sql`).
- Tests: Added transition-rule tests and updated route tests for reviewer read behavior; workspace `typecheck`, `test`, `lint`, and `build` all passed.

---

## 2026-03-28
- Change type: Frontend
- Description: Added route-protection redirects via shared auth session hook, manager review queue page (`/review`) with approve/reject actions, listing detail submit-for-review action, and full email flows (`/auth/confirm`, `/forgot-password`, `/reset-password`) including login next-path redirects.
- Impact: Protected pages now redirect unauthenticated users to login, moderation can be completed from UI, and account confirmation/password recovery paths are usable end-to-end.
- Tests: Re-ran full workspace gates (`typecheck`, `test`, `lint`, `build`) successfully after UI integration.

---

## 2026-03-28
- Change type: DB
- Description: Attempted to apply `db/migrations/0002_expand_listing_intent_statuses.sql` and run live lifecycle verification against dev database; added executable verifier `apps/web-user/scripts/verify-lifecycle-live.ts` that exercises real service/repository transitions (`draft -> submitted -> approved`) plus review queue inclusion/exclusion checks.
- Impact: Repository now has a repeatable live-verification command path for lifecycle + moderation behavior once DB network resolution is available.
- Tests: Live DB verification blocked in current environment by DNS resolution failure to configured DB host (`getaddrinfo ENOTFOUND` / `could not translate host name`). Local workspace gates remain green; rerun after connectivity restore: `set -a; source .env; psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/0002_expand_listing_intent_statuses.sql` and `set -a; source .env; pnpm dlx tsx apps/web-user/scripts/verify-lifecycle-live.ts`.

---

## 2026-03-28
- Change type: DB
- Description: Switched `DATABASE_URL` to Supabase transaction pooler endpoint (`aws-1-eu-central-1.pooler.supabase.com:6543`) and cleaned accidental non-env text from `.env`; applied migration `0002_expand_listing_intent_statuses.sql` successfully in real DB.
- Impact: Real environment DB path is now reachable from this runtime; lifecycle status constraint/index migration is applied on the target database.
- Tests: Verified `psql` connectivity (`select 1`), migration apply output (`ALTER TABLE`, `CREATE INDEX`), and live lifecycle script success (`verify-lifecycle-live.ts` passed for a real fixture id).