# Project Updates

Use this file as the first project memory source before searching the codebase.

## 2026-03-30
- Change type: Frontend
- Description: Converted dashboard from client component with placeholder data to async server component showing real metrics. Created `fetchDashboardMetrics()` helper that queries DB for property count, unit count, tenant count, lease count, and maintenance request count. Updated variant-specific stat cards to display real data. Calculated occupancy rate (leases/units). Added empty state with "Ajouter une propriété" CTA when no data exists. Dashboard now shows live operational metrics instead of "—" placeholders.
- Impact: Dashboard provides immediate value with real data. Users see accurate counts for properties, units, tenants, leases, maintenance requests, and occupancy rate. Empty state guides new users to create first property. Metrics update on page refresh.
- Tests: Dashboard metrics ready for testing with real data.

## 2026-03-30
- Change type: Frontend
- Description: Simplified onboarding page from multi-step wizard to welcome-only screen. Shows account-type specific welcome message and recommended next steps (add properties, configure units, manage tenants). Provides two CTAs: "Accéder au tableau de bord" and "Ajouter une propriété". Removes forced property/unit creation during onboarding, allowing users to set up at their own pace from dedicated property management interface.
- Impact: Onboarding no longer blocks users with required forms. Users can explore dashboard immediately and add properties when ready. Respects that property setup can be time-consuming for users with multiple properties. Better UX for complex setups.
- Tests: Onboarding flow simplified and ready for testing.

## 2026-03-30
- Change type: API
- Description: Standardized authentication to cookie-based approach across all API routes. Created `extractAuthSessionFromCookies()` helper function in `session-adapter.ts` that reads Supabase session from cookies (Edge runtime compatible). Updated all API routes to use cookie auth instead of Bearer tokens: organizations, properties, units, tenants, leases, payments, maintenance (including detail routes). Updated client `postWithAuth()` to use `credentials: "include"` instead of sending Authorization Bearer header.
- Impact: Consistent cookie-based auth flow throughout web-manager app. All server components, API routes, and client components now use cookies. No more mixed Bearer/cookie authentication. Edge runtime compatible.
- Tests: Ready for end-to-end testing - need to verify property creation flow works with new auth mechanism.

## 2026-03-30
- Change type: Other
- Description: Expanded `project-context.md` with detailed account type capabilities breakdown for the three operator types (`self_managed_owner`, `manager_for_others`, `mixed_operator`). Added comprehensive feature lists showing UI composition differences, team management capabilities, and context switching behavior. Clarified that all operator types use the same web-manager platform with different capabilities (not separate systems). Updated Feature Set section with detailed breakdown for Tenant (mobile only), Landlord/Property Manager (web core product), Property Owner (read-only portal), and Platform Admin (internal). Created `.claude/CLAUDE.md` with mandatory pre-work checklist referencing project docs.
- Impact: Project documentation now provides explicit guidance on capability differences between account types, what features are available/restricted per type, and how team management works. Establishes clear boundaries between tenant mobile app vs operator web platform. AI agent now has checklist to consult project docs before code changes.
- Tests: N/A (documentation update only).

## 2026-03-30
- Change type: Frontend
- Description: Implemented clean onboarding flow with cookie-based authentication. Fixed Edge runtime error in middleware by replacing `createAuthRepositoryFromEnv()` (Node.js) with Supabase client query for `organization_memberships`. Updated `create-account` API route to use cookies instead of Bearer token. Simplified account-type page frontend to remove token logic. Applied migration `0005_init_organization_memberships.sql`. Created `/mobile-app` page for tenant download prompt and updated account-type picker to redirect tenant selection to download page instead of showing error.
- Impact: Onboarding flow now works: middleware checks memberships via Supabase (Edge-compatible), API creates membership via cookies, tenant selection redirects to mobile app download page. Clean cookie-based auth throughout. No more "must be logged in" error or Edge runtime crashes.
- Tests: Migration applied successfully, onboarding flow tested end-to-end.

## 2026-03-29
- Change type: API
- Description: Completed cleanup + first implementation scaffold for Slice 1 (Organization, Property, Unit). Removed legacy `apps/web-user`, added DB migration `0001_init_organizations_properties_units.sql`, introduced domain entities, API contracts + validation parsers, data-access repository interfaces, and web-manager service skeleton endpoints (`createOrganization`, `createProperty`, `createUnit`, `listProperties`).
- Impact: Project is now aligned to operations-first architecture with a concrete first vertical slice across DB/domain/contracts/repository/service layers under the new `web-manager` app.
- Tests: Deferred (structure and slice scaffold; runtime tests to be added in next pass).

## 2026-03-29
- Change type: DB
- Description: Implemented real Postgres repository layer for Slice 1 (`packages/data-access/src/properties/postgres-organization-property-unit.repository.ts`) with env-driven connection factory, added web-manager route handlers (`/api/organizations`, `/api/properties`, `/api/units`, `/api/properties/with-units`), and added Supabase token session adapter for server-side auth extraction.
- Impact: Slice 1 is no longer scaffold-only; it now has executable DB-backed create/list endpoints wired to auth session context and repository factories.
- Tests: Applied migration live with `psql` using `.env` (`0001_init_organizations_properties_units.sql`) and verified tables exist (`organizations`, `properties`, `units`).

## 2026-03-29
- Change type: Infra
- Description: Scaffolded new operations-first monorepo structure: `apps/mobile-tenant`, `apps/web-manager`, `apps/web-owner`, `apps/web-admin`, and packages `domain`, `api-contracts`, `data-access`, `ui`, `config`; added root workspace files (`package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`, root `README.md`) and package/app README placeholders.
- Impact: Project now has a clean multi-surface structure aligned to TenantCloud-style product direction, ready for first implementation slices (organization/property/unit, lease, payment, maintenance). Existing legacy `apps/web-user` directory remains for explicit later cleanup/migration.
- Tests: N/A (structure and workspace baseline scaffolding only).

## 2026-03-29
- Change type: Other
- Description: Rebased product direction to a TenantCloud-style property operations SaaS. Rewrote `project-context.md` around 4 sides (tenant mobile, landlord/manager web, owner read-only, platform admin), 9 core entities (organization/property/unit/lease/tenant/payment/maintenance/conversation/document), and 3 primary workflows (onboarding, rent, maintenance).
- Impact: Product truth source now explicitly prioritizes operational property-management flows over listing-centric scope. Updated blueprint guardrails in `docs/blueprint/charter/project-charter.md` and `docs/blueprint/ai/agent-system.md` to enforce this priority in future implementation work.
- Tests: N/A (documentation and operating-rules update only).

## 2026-03-29
- Change type: Other
- Description: Added full UI screen-flow map to `project-context.md` for all 4 product sides: tenant mobile app, landlord/manager web dashboard, owner simplified portal, and platform admin internal system.
- Impact: Product context now includes concrete navigation/screen structure (auth, dashboard, core modules, detail views) to guide feature slicing, API contracts, and route planning.
- Tests: N/A (product knowledge update only).

## 2026-03-29
- Change type: Other
- Description: Added brand system and localization standards to `project-context.md`: palette (`#FFFFFF`, `#0063FE`, `#010A19`), GALANO GROTESQUE typography guidance (Semi Bold for wordmark/headings, Regular for body), and French-first language direction for DRC market.
- Impact: Future UI/copy decisions now have explicit visual identity and language defaults aligned to brand and target market.
- Tests: N/A (product knowledge and design direction update only).

## 2026-03-29
- Change type: Other
- Description: Added explicit product inspiration note in `project-context.md` naming TenantCloud as primary inspiration and defining boundaries: emulate workflow model, avoid direct cloning of brand assets/copy.
- Impact: Future product and UX decisions now have a clear benchmark while preserving Hhousing identity and DRC-specific adaptation.
- Tests: N/A (product strategy documentation update only).

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

---

## 2026-03-28
- Change type: Frontend
- Description: Reworked core product UX with a stronger landing + feed experience, including conversion-focused hero, quick metrics, refined filter panel, richer listing cards with status badges, and empty-state CTA.
- Impact: Home route now supports pre-login preview messaging, clearer navigation intent, and denser listing decision context without changing existing API contracts.
- Tests: Ran `pnpm -C apps/web-user typecheck` and `pnpm -C apps/web-user build` successfully after UI refactor.

---

## 2026-03-28
- Change type: Frontend
- Description: Converted `/listings/new` to a 3-step listing creation wizard (Basics -> Pricing -> Review) with per-step validation gates, back/next flow, and final review summary before submit.
- Impact: Listing creation now has a guided conversion path that reduces form drop-off and clarifies required data before API submission.
- Tests: Ran `pnpm -C apps/web-user typecheck` and `pnpm -C apps/web-user build` successfully after wizard implementation.

---

## 2026-03-28
- Change type: Frontend
- Description: Upgraded listing detail route with lifecycle-aware conversion panel and action paths for each status (submit draft, monitor review, share approved, replace rejected), plus refreshed visual styling.
- Impact: Detail page now acts as a decision surface and not only a data readout, improving progression from listing view to next operational action.
- Tests: Ran `pnpm -C apps/web-user typecheck` and `pnpm -C apps/web-user build` successfully after detail-page conversion updates.

---

## 2026-03-28
- Change type: Frontend
- Description: Added richer listing media/trust UX layer: feed cards now include visual media banners and key facts chips; detail view now includes media stack, trust signals, and conversion-readiness facts.
- Impact: Listing discovery and detail pages now present stronger product confidence cues and clearer conversion context without changing backend contracts.
- Tests: Re-ran `pnpm -C apps/web-user typecheck` and `pnpm -C apps/web-user build` successfully.

---

## 2026-03-28
- Change type: Frontend
- Description: Added real listing media support end-to-end: optional `heroImageUrl` and `galleryImageUrls` now accepted in create input, persisted via repository layer, and rendered on feed/detail with visual fallbacks when media is missing.
- Impact: Listing wizard now captures media URLs, cards/detail now use real media assets from stored listing records, and DB migration `0003_add_listing_media_fields.sql` introduces storage columns while remaining backward compatible.
- Tests: Re-ran workspace `pnpm typecheck` and web build `pnpm -C apps/web-user build` successfully.

---

## 2026-03-28
- Change type: DB
- Description: Applied `db/migrations/0003_add_listing_media_fields.sql` in real DB and added live verifier script `apps/web-user/scripts/verify-media-live.ts` to assert media persistence/readback.
- Impact: `listing_intents` now contains `hero_image_url` and `gallery_image_urls`, and live records confirm feed/detail payloads include stored media values.
- Tests: Verified schema columns via `information_schema.columns` and executed live verification successfully (`Live media verification passed for lst_media_1774727237555`). Note: when using `psql`, strip `uselibpqcompat=true` from URL query params because it is Node-pg specific.

---

## 2026-03-28
- Change type: Frontend
- Description: Implemented true client-side file upload for listing media in `/listings/new`: wizard now accepts hero/gallery files, uploads them to Supabase Storage bucket (`NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET`, default `listing-media`), and submits returned URLs in create payload.
- Impact: Media inputs no longer require manual URL entry; upload flow is now first-class and aligned with real user behavior while preserving existing media URL persistence fields.
- Tests: Ran `pnpm -C apps/web-user typecheck` and `pnpm -C apps/web-user build` successfully after upload integration.