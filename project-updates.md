# Project Updates

Use this file as the first project memory source before searching the codebase.

## 2026-04-05
- Change type: Web + API + DB
- Description: Added a dedicated tenant onboarding page at `/dashboard/tenants/add` and a dedicated lease move-in workflow at `/dashboard/leases/move-in`. Added migration `0018_tenant_profiles_and_move_in.sql` to extend tenants with `date_of_birth` and `photo_url`, extend leases with term and billing metadata, and create `lease_charge_templates` for deposits and extra lease charges. Extended shared domain/contracts/data-access layers, updated tenant and lease services, moved tenants list UI to the same CTA-to-add-page pattern used for properties and units, and updated tenant detail edit/view to preserve the new profile fields.
- Impact: Operators can now create tenants through a focused add flow with DOB and photo support, then move a tenant into a property/unit from the leases area while capturing fixed vs month-to-month terms, billing schedule defaults, deposits, and other charges in one workflow.
- Notes: Invite-by-email is present as a placeholder in the move-in UI only; persisted lease charge templates and billing-frequency fields are not yet consumed by downstream payment generation or lease detail screens.
- Tests: `pnpm lint` ✓, `pnpm typecheck` ✓, `pnpm test` ✓ (32 files / 94 tests), `pnpm -C apps/web-manager build` ✓.

## 2026-04-05
- Change type: Web + Frontend
- Description: Moved unit creation out of the Portfolio `Unités` tab and into a dedicated `/dashboard/units/add` screen. Extracted the richer unit creation flow into `UnitCreateForm`, kept the multi-unit bulk-create behavior, and replaced the in-tab form with an add-unit CTA card plus the existing unit list/filter view.
- Impact: The portfolio units tab is now focused on browsing and filtering existing units, while unit creation gets its own dedicated screen with the full expanded form.
- Tests: `pnpm lint` ✓, `pnpm typecheck` ✓, `pnpm test` ✓ (31 files / 93 tests), `pnpm -C apps/web-manager build` ✓.

## 2026-04-05
- Change type: Web + Frontend
- Description: Upgraded the Portfolio `Unités` tab create form to match the richer property setup model. The in-tab unit form now captures rent, deposit, currency, bedrooms, bathrooms, surface, amenities, and features, and can create multiple units in one action for existing multi-unit properties by treating the entered unit number as a shared prefix. Shared amenity/feature option lists were extracted so the property-add and unit-add forms stay aligned.
- Impact: Operators can add realistic units to an existing property without falling back to the old thin unit form, and bulk unit creation is available directly from the units workspace for eligible multi-unit properties.
- Tests: `pnpm lint` ✓, `pnpm typecheck` ✓, `pnpm test` ✓ (31 files / 93 tests), `pnpm -C apps/web-manager build` ✓.

## 2026-04-05
- Change type: Web + API + DB
- Description: Added hard enforcement for single-unit properties so they cannot receive a second unit after creation. Added migration `0017_single_unit_max_one_unit.sql` with a `units` trigger that rejects inserts or property moves when the target property is `single_unit` and already has a unit. Also updated the unit-create service to return a clean validation error and filtered the Portfolio `Unités` add-unit dropdown to hide ineligible single-unit properties.
- Impact: Operators can no longer accidentally add extra units to single-unit assets from the UI, and direct DB or API writes are blocked as well.
- Tests: `pnpm lint` ✓, `pnpm typecheck` ✓, `pnpm test` ✓ (31 files / 93 tests), `pnpm -C apps/web-manager build` ✓.

## 2026-04-05
- Change type: Web + API + DB
- Description: Rebuilt `/dashboard/properties/add` into a real property setup flow. Added migration `0016_property_setup_fields.sql` for `properties.property_type`, `year_built`, `photo_urls`, plus richer unit metadata (`deposit_amount`, bedrooms, bathrooms, size, amenities, features). Extended domain/contracts/repositories and replaced the old property-create path with a transactional property-plus-units create flow: single-unit creates one unit, multi-unit creates many units from one shared template. The add form now supports single vs multi-unit selection, year built, rent, deposit, bedrooms, bathrooms, surface, amenities, features, managed-client selection, and shared photo uploads through Supabase Storage.
- Impact: Operators can onboard a realistic property portfolio in one submit instead of creating a thin property first and filling unit details later. Multi-unit setup now creates the requested number of units immediately while keeping photos shared at property level.
- Tests: `pnpm lint` ✓, `pnpm typecheck` ✓, `pnpm test` ✓ (30 files / 91 tests), `pnpm build` ✓.

## 2026-04-05
- Change type: Web + Infra
- Description: Disabled Next.js experimental `devtoolSegmentExplorer` in `apps/web-manager/next.config.ts` to avoid intermittent dev-only React Client Manifest failures involving `next-devtools/.../segment-explorer-node.js#SegmentViewNode` during dashboard navigation.
- Impact: Development navigation should stop hitting the transient `/dashboard/properties` 500 caused by the Next devtools segment explorer path, while production behavior remains unchanged.
- Tests: `pnpm lint` ✓, `pnpm typecheck` ✓, `pnpm test` ✓ (29 files / 89 tests), `pnpm build` ✓.

## 2026-04-05
- Change type: Web + Frontend
- Description: Moved property creation out of the `Biens` tab and into a dedicated `/dashboard/properties/add` screen. The main portfolio tab now shows a simple CTA card instead of the full property-create form, while the dedicated add page reuses the same scope-aware create flow and managed-client selection.
- Impact: The portfolio screen is lighter and more browseable, while property creation gets its own focused page.
- Tests: `pnpm lint` ✓, `pnpm typecheck` ✓, `pnpm test` ✓ (29 files / 89 tests), `pnpm build` ✓.

## 2026-04-05
- Change type: Web + Frontend
- Description: Added a property filter to the `Unités` tab inside `/dashboard/properties`. Operators can now narrow the units table to a single parent property while staying in the portfolio workspace.
- Impact: The new tabbed portfolio page is easier to scan when an organization manages many units across multiple properties.
- Tests: `pnpm lint` ✓, `pnpm typecheck` ✓, `pnpm test` ✓ (29 files / 89 tests), `pnpm build` ✓.

## 2026-04-05
- Change type: Web + Frontend
- Description: Renamed the `/dashboard/properties` area in operator navigation to `Portfolio` and split the screen into two tabs backed by the existing data: `Biens` and `Unités`. The portfolio page now separates property creation/listing from unit creation/listing while keeping the same route and scope-aware data source.
- Impact: Operators can switch between the building-level and unit-level view without leaving the same workspace, and the navigation language now reflects a broader portfolio surface instead of a single flat properties page.
- Tests: `pnpm lint` ✓, `pnpm typecheck` ✓, `pnpm test` ✓ (29 files / 89 tests), `pnpm build` ✓.

## 2026-04-05
- Change type: Web + Frontend
- Description: Restructured the operator sidebar into clearer navigation groups instead of one flat list. The shell now separates `Tableau de bord`, `Opérations locatives`, `Finances`, `Services`, and `Organisation`, while keeping the managed `Clients` entry inside the property-operations section when that capability exists.
- Impact: The main shell better matches operator mental models and prepares the navigation for future finance/service expansion without turning the sidebar into a long unstructured list.
- Tests: `pnpm lint` ✓, `pnpm typecheck` ✓, `pnpm test` ✓ (29 files / 89 tests), `pnpm build` ✓.

## 2026-04-05
- Change type: Web + Frontend
- Description: Upgraded `/dashboard/clients` from a static summary grid into a triage-friendly list. Each client card now includes active tenant count, overdue payment count, open maintenance count, urgent maintenance alerts, and the page sorts clients so the most operationally stressed portfolios appear first.
- Impact: Operators can spot which client portfolios need attention before drilling into the detail view, instead of opening each client one by one.
- Tests: `pnpm lint` ✓, `pnpm typecheck` ✓, `pnpm test` ✓ (29 files / 89 tests), `pnpm build` ✓.

## 2026-04-04
- Change type: Web + Frontend
- Description: Expanded `/dashboard/clients/[id]` from financial-only reporting into a more operational client portfolio view. Added client-scoped tenant and maintenance rollups derived from the managed property set: active tenant count, recent active leases/tenant roster, open/in-progress/urgent maintenance counters, and a recent maintenance snapshot with status and priority context.
- Impact: Client detail now helps operators monitor occupancy, cash, tenants, and maintenance from one place before drilling into tenants or maintenance modules separately.
- Tests: `pnpm lint` ✓, `pnpm typecheck` ✓, `pnpm test` ✓ (29 files / 89 tests), `pnpm build` ✓.

## 2026-04-04
- Change type: Web + API + Frontend
- Description: Expanded managed client detail into an actionable portfolio view. Added financial rollups on `/dashboard/clients/[id]` using the client-scoped managed property set plus filtered leases/payments: active leases, expected monthly rent, cash collected this month, and overdue balance. Added direct reassignment flow from client detail via new `PATCH /api/properties/[id]/client`, allowing managed properties to move between clients or become unassigned without opening property edit.
- Impact: Client pages now work as real portfolio management screens instead of passive summaries. Operators can inspect client-level financial health and rebalance managed properties directly from the client context.
- Tests: `pnpm lint` ✓, `pnpm typecheck` ✓, `pnpm test` ✓ (29 files / 89 tests), `pnpm build` ✓.

## 2026-04-04
- Change type: Web + Frontend
- Description: Added operator-facing managed clients navigation and portfolio views. Dashboard sidebar now exposes `Clients` only for operators with managed scope capability. Added `/dashboard/clients` list view with client-level property/unit/occupancy summaries and `/dashboard/clients/[id]` detail view with managed properties for that client. Property list/detail screens now deep-link client labels to the new client portfolio pages.
- Impact: Owner-client records are now navigable and useful in the shell instead of only being selectable during property edit/create. Operators can inspect managed portfolios grouped by client directly from the web app.
- Tests: `pnpm lint` ✓, `pnpm typecheck` ✓, `pnpm test` ✓ (28 files / 86 tests), `pnpm build` ✓.

## 2026-04-04
- Change type: Web + DB + API
- Description: Replaced free-text managed property client labeling with real org-scoped owner-client records. Added migration `0015_init_owner_clients.sql` with `owner_clients` table, `properties.client_id`, and backfill from legacy `client_name`. Extended property/domain/data-access layers so properties now carry `clientId` + display `clientName`. Added `GET/POST /api/owner-clients` plus property create/update validation against real client ids. Properties dashboard now loads owner clients, allows inline client creation, and uses client selection instead of free-text entry for managed properties.
- Impact: Managed portfolios can now be grouped on stable client entities instead of loose text labels, which is the foundation for client-level reporting and navigation later.
- Notes: `client_name` is still kept as a denormalized display field during this transition; the new source of truth is `properties.client_id -> owner_clients.id`.
- Tests: `pnpm lint` ✓, `pnpm typecheck` ✓, `pnpm test` ✓ (28 files / 86 tests), `pnpm build` ✓.

## 2026-04-04
- Change type: Web + API + Authorization
- Description: Closed remaining operator-scope refetch gaps in web-manager. `GET /api/tenants`, `GET /api/leases`, and `GET /api/payments` now filter results through the active owned/managed portfolio before returning to client-side screens. `POST /api/units` now rejects property targets outside the active scope, and `GET/PATCH/DELETE /api/units/[id]` now validate the unit against the active portfolio before read/write/delete.
- Impact: Client-hydrated pages such as unit detail can no longer pull org-wide tenants, leases, payments, or units after mount when the shell is set to `Mon parc` or `Parc gere`.
- Tests: `pnpm lint` ✓, `pnpm typecheck` ✓, `pnpm test` ✓ (27 files / 83 tests), `pnpm build` ✓.

## 2026-04-04
- Change type: Web + API + Authorization
- Description: Propagated the hybrid operator scope deeper across web-manager. Added scoped portfolio helper usage across tenants, leases, payments, maintenance, messages, and documents server pages plus route handlers. Property detail editing now supports `managementContext` and optional `clientName`. Tightened route authorization so payment and maintenance mutations validate active scope before write. Payment creation, lease creation, maintenance creation, and monthly rent-charge generation now reject cross-scope targets and rent generation is filtered by `properties.management_context` in the repository layer.
- Impact: `Mon parc` vs `Parc gere` now changes more than the shell. Operators see and mutate only the active portfolio slice across major modules, and recurring charge generation no longer leaks across owned/managed portfolios.
- Notes: Owner-client portfolio modeling is still intentionally deferred; managed grouping is still based on free-text `clientName`.
- Tests: `pnpm lint` ✓, `pnpm typecheck` ✓, `pnpm test` ✓ (27 files / 83 tests), `pnpm build` ✓.

## 2026-04-04
- Change type: Web + DB + UX
- Description: Implemented the first hybrid operator context slice for web-manager. Added cookie-backed operator scope resolution (`owned` vs `managed`) with `GET/POST /api/operator-context`, a dashboard shell switcher, scope-aware sidebar labeling, and server helpers derived from persisted role + `canOwnProperties`. Added migration `0014_property_management_context.sql` introducing `properties.management_context` and optional `client_name`. Extended property/domain/contracts/repository create/list flow to persist and filter by management context. Dashboard metrics and the properties page now resolve the active operator scope server-side and scope property/unit/lease/maintenance counts plus property creation accordingly.
- Impact: Mixed operators can switch between `Mon parc` and `Parc gere` in the shell; self-managed owners and pure managers are locked to their valid scope. Properties now carry explicit portfolio context, enabling real scoped filtering instead of onboarding-only variant copy.
- Notes: This slice scopes dashboard + properties only. Remaining modules (tenants, payments, maintenance detail flows, messages, documents) still need the same context propagated through their join paths.
- Tests: `pnpm lint` ✓, `pnpm typecheck` ✓, `pnpm test` ✓ (27 files / 83 tests), `pnpm build` ✓.

## 2026-04-03
- Change type: Infra + Frontend
- Description: Pinned `apps/web-manager` Next.js workspace root explicitly in `next.config.ts` via `outputFileTracingRoot` and `turbopack.root` to stop root inference from an unrelated external lockfile (`/Users/marcim/package-lock.json`).
- Impact: Web-manager dev/build now resolves against the repo root deterministically instead of an inferred parent directory, reducing stale asset and file-watching issues in local development.
- Tests: `pnpm -C apps/web-manager build` ✓. `pnpm -C apps/web-manager typecheck` still fails in existing `.next/types/validator.ts` generated state (`Cannot find module './routes.js'`), unrelated to this config change.

## 2026-04-03
- Change type: Mobile + Messaging + Navigation
- Description: Simplified tenant mobile information architecture to five top-level tabs only: `Accueil`, `Paiements`, `Maintenance`, `Inbox`, `Profil`. Moved lease and documents into a nested `Profil` stack (`/(tabs)/account/lease`, `/(tabs)/account/documents`) and replaced the flat tenant messages tab with a nested inbox flow (`/(tabs)/messages`, `/(tabs)/messages/[id]`). Tenant inbox cards now emphasize sender organization name, property name, and last message preview instead of lease/unit-heavy context. Added `organizationName` to tenant conversation payloads from the shared messaging repository so mobile can show who the thread is from cleanly.
- Impact: Tenant mobile navigation is narrower and more realistic, and messaging now behaves like a plain inbox/thread flow instead of a manager-style operations console.
- Notes: Home quick action for bail now routes into the profile stack. Tenant message detail intentionally hides the previous context card.
- Tests: `pnpm lint` ✓, `pnpm typecheck` ✓, `pnpm test` ✓ (26 files / 80 tests), `pnpm build` ✓, `pnpm -C apps/mobile-tenant typecheck` ✓.

## 2026-04-03
- Change type: Messaging + Mobile + API
- Description: Implemented tenant-side messaging read/send flow to complete two-way conversations. Added tenant messaging contracts/validators in `packages/api-contracts` and extended `MessageRepository` with tenant list/detail/send methods in Postgres data-access (ownership enforced by `tenants.auth_user_id`). Added mobile API routes in web-manager: `GET /api/mobile/messages/conversations`, `GET /api/mobile/messages/conversations/[id]`, `POST /api/mobile/messages/conversations/[id]/messages`. Added route tests for all three endpoints (auth, not found/validation, success). Added tenant mobile `Messages` tab with conversation search, conversation thread view, context card, and message composer wired to new endpoints.
- Impact: Tenant app now has live two-way messaging with management on existing conversation threads, matching manager-side messaging model.
- Notes: Conversation creation remains manager-initiated by design (approved v1 rule).
- Tests: `pnpm typecheck` ✓, `pnpm test` ✓ (26 files / 80 tests), `pnpm lint` ✓, `pnpm build` ✓, `pnpm -C apps/mobile-tenant typecheck` ✓.

## 2026-04-03
- Change type: Messaging + DB + API + Frontend
- Description: Implemented manager-side messaging v1 across schema, contracts, repositories, routes, services, tests, and dashboard UI. Added migration `0013_init_conversations_messages.sql` with `conversations` + `messages` tables (org-scoped), sender-side constraint, and indexes. Enforced one conversation per `(organization_id, tenant_id, unit_id)` and create-on-first-outbound-message via upsert in repository. Added manager inbox APIs: `GET/POST /api/messages/conversations`, `GET /api/messages/conversations/[id]`, `POST /api/messages/conversations/[id]/messages`. Added manager dashboard page `/dashboard/messages` + `MessagingManagementPanel` with search, property filter, conversation list sorting, thread view, context panel, and send/start actions. Added manager unread model using `manager_last_read_at` and tenant-authored message timestamps only.
- Impact: Managers now have a functional tenant messaging inbox with scoped conversations, quick context, and deterministic unread behavior per approved v1 constraints.
- Notes: Current slice is manager-side only; tenant-side UI/routes are next.
- Tests: `pnpm typecheck` ✓, `pnpm test` ✓ (23 files / 73 tests), `pnpm lint` ✓, `pnpm build` ✓.

## 2026-04-03
- Change type: Mobile + DB + API
- Description: Implemented maintenance photo upload and payment receipt navigation. Added `photo_urls text[]` column to `maintenance_requests` (migration `0012_maintenance_photo_urls.sql`). Extended `MaintenanceRequest` domain entity with `photoUrls: string[]`. Updated all SELECT/INSERT queries in the Postgres maintenance repository. Updated `POST /api/mobile/maintenance` to accept and store `photoUrls[]` (capped at 10, validated as strings). Mobile create form now supports picking up to 4 images via `expo-image-picker`, uploads them directly to Supabase Storage `maintenance-photos` bucket before submission, and shows a deletable thumbnail strip. Maintenance detail screen renders photo thumbnails that open full image on tap. Paid payment rows now show a "Voir les reçus →" link that navigates to the Documents tab.
- Impact: Tenants can attach visual evidence to maintenance requests. Documents tab accessible from paid payments for receipt lookup.
- Notes: Requires a `maintenance-photos` Supabase Storage bucket (public read, authenticated write).
- Tests: `pnpm typecheck` ✓, `pnpm -C apps/mobile-tenant typecheck` ✓, `pnpm test` ✓ (64 tests), `pnpm build` ✓.

## 2026-04-03
- Change type: Mobile + Infra
- Description: Made tenant mobile API base URL auto-resolve in dev by Expo host/platform, so no manual `.env` API URL switching. `EXPO_PUBLIC_API_BASE_URL` remains supported as explicit override and remains required outside dev.
- Impact: `apps/mobile-tenant/src/lib/env.ts` now resolves `apiBaseUrl` in order: explicit env -> Expo host URI -> platform fallback (`10.0.2.2` on Android emulator, `127.0.0.1` on others). `apps/mobile-tenant/.env` no longer hardcodes a local API URL.
- Tests: `pnpm -C apps/mobile-tenant typecheck` ✓.

## 2026-04-03
- Change type: Mobile + Infra
- Description: Fixed tenant mobile runtime regressions after the maintenance detail slice. Hardened the mobile API client to return structured failures on network/non-JSON server errors instead of throwing unhandled fetch exceptions. Fixed home dashboard to exit loading state when lease/payments requests fail. Restructured maintenance routes from a conflicting `maintenance.tsx` + `maintenance/[id].tsx` shape to a nested Expo Router stack (`maintenance/index.tsx`, `maintenance/[id].tsx`, `maintenance/_layout.tsx`) so the tab no longer lands on the detail screen with a missing id.
- Impact: Mobile tabs now fail visibly instead of hanging, and the maintenance tab opens its list screen correctly. Server reachability issues now surface as an explicit API/network error message in-app.
- Tests: `pnpm lint` ✓, `pnpm typecheck` ✓, `pnpm test` ✓, `pnpm build` ✓, `pnpm -C apps/mobile-tenant typecheck` ✓.

## 2026-04-03
- Change type: Mobile + API
- Description: Implemented tenant documents read flow. Added tenant-only endpoint `GET /api/mobile/documents` in web-manager using bearer-token session extraction and lease-scoped document visibility. The route resolves the authenticated tenant's current lease, combines lease-attached and tenant-attached documents, deduplicates, sorts by newest first, and returns a mobile-safe document list. Added mobile tenant `Documents` tab with type filters, loading/error/empty states, and tap-to-open document links.
- Impact: Tenant mobile app now exposes lease agreements, receipts, and notices as a real read surface instead of a missing tab. Documents remain scoped to the authenticated tenant's current lease context.
- Tests: Added route tests for `/api/mobile/documents` (unauthenticated, forbidden, no active lease, success). Full gates pending current run.

## 2026-04-02
- Change type: API + Infra
- Description: Stabilized invite-activation slice quality gates. Updated invitation route unit tests (`/api/mobile/invitations/validate`, `/api/mobile/invitations/accept`, `/api/tenants/[id]/invite`) to mock shared repository factories so tests do not instantiate real Postgres dependencies in Vitest. Updated lease service tests to include newly required tenant-invitation repository methods in mocked `TenantLeaseRepository` objects. Added root pnpm override to pin `@types/react` to `19.0.14` and remove cross-workspace React type splits that were breaking web-manager typecheck/build.
- Impact: Invite activation and lease test coverage now runs fully isolated from DB env (`DATABASE_URL` no longer required for these unit tests). Workspace type system is consistent across web and mobile package installs, eliminating React namespace incompatibility errors during Next.js type validation.
- Tests: `pnpm typecheck` ✓, `pnpm test` ✓ (46 tests), `pnpm build` ✓.

## 2026-04-02
- Change type: Mobile + API
- Description: Implemented Slice 5 item 3 (tenant lease read). Added tenant-only endpoint `GET /api/mobile/lease` in web-manager using bearer-token session extraction (`extractAuthSessionFromRequest`) and strict tenant-role guard (`requireTenantSession`). Extended `TenantLeaseRepository` with `getCurrentLeaseByTenantAuthUserId(...)` and implemented Postgres query selecting the latest active/pending lease for the authenticated tenant within organization scope. Mobile app `/(tabs)/lease` now calls this endpoint and renders loading, error (with retry), empty (no active lease), and data states.
- Impact: Tenant mobile app now has real lease read functionality wired end-to-end from mobile UI to API and DB repository layer, with role-safe access boundaries.
- Tests: Added route tests for `/api/mobile/lease` (unauthenticated, non-tenant forbidden, success) and updated lease service test mocks for expanded repository interface. Gates passing: `pnpm typecheck`, `pnpm -C apps/mobile-tenant typecheck`, `pnpm test`, `pnpm build`.

## 2026-04-02
- Change type: Mobile + Infra
- Description: Scaffolded `apps/mobile-tenant` Slice 5 foundation and auth base with Expo + Expo Router. Added package setup (`package.json`, `app.json`, `babel.config.js`, `tsconfig.json`, `expo-env.d.ts`) and route structure: auth login (`/(auth)/login`) and guarded tabs (`Accueil`, `Bail`, `Maintenance`, `Paiements`, `Compte`). Implemented mobile auth context with Supabase session bootstrap, auth state listener, sign-in/sign-out methods, and route-guard redirects in root layout. Added env/config modules (`src/lib/env.ts`, `src/lib/supabase.ts`) plus typed API client seed (`src/lib/api-client.ts`) for next slices.
- Impact: Tenant mobile app now has a real runnable shell with persistent authentication and protected navigation, ready to plug lease/maintenance/payments read/write APIs in follow-up slices.
- Tests: Typecheck deferred until dependencies are installed in `apps/mobile-tenant` (`tsc` missing before install).

## 2026-04-02
- Change type: API + Frontend + Authorization
- Description: Implemented permission guards for payments and maintenance verticals (same pattern as leases). Payments: RECORD_PAYMENT on create/mark-paid/generate, VIEW_PAYMENTS on list/detail. Maintenance: MANAGE_MAINTENANCE on create, VIEW_MAINTENANCE on list/detail, UPDATE_MAINTENANCE_STATUS on patch. All route handlers and dashboard pages wired with `createTeamFunctionsRepo()`. Added `getMembershipById` to `AuthRepository` interface and `PostgresAuthRepository`. Added `updateMemberFunctions` service + `PATCH /api/organizations/members/:id/functions` endpoint to reassign functions for existing property_manager members. Team management panel updated with inline "Éditer" button per property_manager row and inline checkbox editor with save/cancel.
- Impact: Payments and maintenance operations now enforce function-based access. Team leads can update a member's assigned functions post-invite without reinviting.
- Tests: 38 passed (12 test files); typecheck clean. Updated payments/[id] and maintenance/[id] test mocks to include `createTeamFunctionsRepo` and corrected happy-path session role to `"landlord"` to bypass permission check in GET route unit tests.
- Notes: Properties, tenants, and documents modules still use role-based access; migrate in subsequent slices.

## 2026-04-01
- Change type: API + Frontend
- Description: Implemented email-based user lookup for team member invites. Replaced raw UUID (`userId`) input with email-based workflow: team invite form now takes email, validates it, calls new `POST /api/organizations/members/lookup` endpoint which queries Supabase Admin API to resolve email to `userId`, then proceeds with existing invite flow. Added contract types `LookupUserByEmailInput` + `LookupUserByEmailOutput` and validator `parseLookupUserByEmailInput`. Endpoint requires `SUPABASE_SERVICE_ROLE_KEY` for admin queries.
- Impact: Team members can now be invited by email instead of requiring manual UUID entry. Better UX: email input field with validation, automatic lookup on form submission, single-step invite flow.
- Tests: All 38 tests pass; `pnpm typecheck`, `pnpm lint`, `pnpm build` clean.
- Notes: Requires `SUPABASE_SERVICE_ROLE_KEY` environment variable to be set on server (Node.js API routes only, not middleware/Edge).

## 2026-03-31
- Change type: API + Authorization
- Description: Implemented Phase 3 (first vertical) by enforcing function-based permissions on leases. Added real permission helper behavior (`requirePermission`) with landlord bypass and property_manager function checks (`listMemberFunctions`). Leases operations now guarded by capabilities: `CREATE_LEASE` for create, `VIEW_LEASE` for list/detail read, `EDIT_LEASE` for detail patch. Wired `teamFunctionsRepository` dependency through leases route handlers and dashboard lease-loading paths to keep server-rendered pages aligned with API authorization rules.
- Impact: Team functions now affect real behavior, not only invite metadata. A property_manager lacking lease permissions is blocked from lease read/write operations (403). Existing managers with no assigned functions keep temporary backward-compatible access.
- Tests: Included in passing root `pnpm typecheck`, `pnpm test`, and `pnpm build` (12 test files, 38 tests). Added coverage for missing `view_lease` (route) and missing `create_lease` (service).
- Notes: Remaining modules (payments, maintenance, properties, tenants, documents) still use role-based access and should be migrated to permission guards in subsequent slices.

## 2026-03-31
- Change type: API + Frontend + Data Layer
- Description: Implemented Phase 2 of the team functions system. Team invite flow now supports assigning real org-scoped functions during invite (`functions[]` in payload) with server-side validation and persistence through `TeamFunctionsRepository`. Added business rules: `property_manager` invites must include at least one function, landlords cannot receive functions, and only landlords can assign `ADMIN`. Team dashboard now renders available functions in the invite form, filters out `ADMIN` for property managers, and shows assigned function badges per member.
- Impact: Team members can now be onboarded with structured work functions instead of implicit full access. The team page is now the operational control point for function-aware invites and visibility, while preserving the existing base role model.
- Tests: Included in passing root `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build` (12 test files, 36 tests).
- Notes: Route-level permission enforcement across properties/leases/payments/maintenance is still pending; current phase only makes membership invites and team visibility function-aware.

## 2026-03-31
- Change type: DB + API + Data Layer
- Description: Implemented Phase 1 of Role vs Function (Permissions) System. Separated concerns: roles (who you are: landlord/property_manager) now distinct from functions (what you can do: LEASING_AGENT/ACCOUNTANT/MAINTENANCE_MANAGER/ADMIN). Added two new database tables (`team_functions` and `member_functions`) with org-scoped function templates and member function assignments. Created migrations `0009_team_functions_and_permissions.sql` (schema + validation triggers) and `0010_seed_default_team_functions.sql` (seeds 4 default functions per org). Added `Permission` enum and `TeamFunctionCode` enum to api-contracts. Extended data-access with `TeamFunctionsRepository` (19 methods: list/get functions, assign/revoke member functions, check member permissions). Updated team-members service to support function-based escalation guards (property_manager cannot assign ADMIN function). Updated invite validation to accept optional `functions` array in payload. All gates passing: typecheck, lint, build.
- Impact: Codebase now has permissions infrastructure ready for Phase 2 (UI) and Phase 3 (route guards). Org teams can be built on granular access control model while preserving backward-compatible role-based defaults. Database triggers ensure data integrity (cross-org assignments blocked).
- Tests: No new tests in Phase 1 (schema + data-layer setup); quality gates: `pnpm typecheck` ✓, `pnpm lint` ✓, `pnpm build` ✓.
- Notes: Function assignment in invite payload prepared but commented out in service (ready for Phase 2 UI). Seeds create full permission buckets per org on first deploy.

## 2026-03-31
- Change type: API + Frontend
- Description: Expanded Teams/Memberships invite model so both `landlord` and `property_manager` can invite team members. Invite payload now supports target role selection (`property_manager` or `landlord`) via contracts validator updates. Added escalation guard: property managers cannot invite landlords. Updated Team UI invite form with role selector and inviter-role-aware options.
- Impact: Team growth no longer bottlenecked on landlord-only flow; organizations can delegate team onboarding to managers while preventing upward role escalation.
- Tests: Included in passing root `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` (12 test files, 34 tests).

## 2026-03-31
- Change type: API + Frontend
- Description: Implemented Teams/Memberships slice for web-manager. Added new API contracts for memberships (`ListOrganizationMembersOutput`, `InvitePropertyManagerInput/Output`) and validator `parseInvitePropertyManagerInput`. Extended auth repository with organization member listing and membership creation methods (`listMembershipsByOrganization`, `createOrganizationMembership`). Added app service layer for team operations (`listOrganizationMembers`, `invitePropertyManager`) with organization scoping and landlord-only invite enforcement. Added new route `GET/POST /api/organizations/members`. Added new dashboard page `/dashboard/team` and `TeamManagementPanel` UI to list members and add a `property_manager` by user ID with optional `canOwnProperties` capability. Added route tests for auth rejection, validation, success list, and invite creation.
- Impact: Landlords can now manage team memberships inside their current organization context and add property managers without touching database manually. Access remains scoped to `session.organizationId` and non-landlord operators cannot invite members.
- Tests: Included in passing root `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` (12 test files, 32 tests).

## 2026-03-31
- Change type: API + Frontend
- Description: Implemented Slice 4 — Documents Depth. Added `GET /api/session` route returning `{ userId, organizationId, role }` for client-component consumption. Created `ContextualDocumentPanel` component: fetches its own session context, lists documents filtered to a specific attachment (type + id), and handles real Supabase Storage upload (`documents` bucket: `{orgId}/{attachmentType}/{attachmentId}/{ts}-{filename}`) then records metadata via `POST /api/documents`. Replaced placeholder URL in `DocumentManagementPanel` with the same real Supabase Storage upload flow. Added `ContextualDocumentPanel` to the bottom of all four entity detail pages: lease, tenant, unit, and property — pre-wired with the appropriate `attachmentType` and `attachmentId`.
- Impact: Documents are now contextually accessible from every entity detail page; upload creates a real file in Supabase Storage and records metadata in the `documents` table; standalone documents page upload also fixed. Prerequisite: `documents` storage bucket must be created in Supabase dashboard as a public bucket.
- Tests: Included in passing root `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` (29 routes).

## 2026-03-31
- Change type: API + DB + Frontend
- Description: Implemented Slice 3 — Maintenance Workflow Depth. Added migration `0008_maintenance_workflow_depth.sql` with assignee/notes/update timestamp fields on `maintenance_requests` plus new `maintenance_request_events` timeline table. Extended maintenance domain/contracts/repository with actionable fields (`assignedToName`, `internalNotes`, `resolutionNotes`) and timeline events. Replaced status-only PATCH flow with richer maintenance-update flow (status + assignment + notes). Upgraded maintenance detail route GET to return `{ request, timeline }` and maintenance detail UI to support assignment, note updates, status transitions, and lifecycle history rendering. Updated maintenance list filter label from "En cours" to "Assignées" and made dashboard maintenance count reflect active workload only (`open` + `in_progress`).
- Impact: Operators can assign requests, maintain internal/resolution notes, and track visible lifecycle history; request detail is now operationally actionable while preserving existing status controls.
- Tests: Included in passing root `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.

## 2026-03-31
- Change type: API + DB + Frontend
- Description: Implemented Slice 2 — Rent Ledger / Monthly Charge Generation. Added `charge_period TEXT` column + partial unique index on `payments` table (`0007_add_charge_period_to_payments.sql`). Extended `Payment` domain type with `chargePeriod`. Added `GenerateRentChargesInput/Output` contracts and `parseGenerateRentChargesInput` validator. Added `generateMonthlyCharges` to `PaymentRepository` and implemented via single INSERT…SELECT using `gen_random_uuid()` with `ON CONFLICT DO NOTHING`. Added `generateRentCharges` app-service function. Created `POST /api/payments/generate` route. Updated payments UI with a period picker + "Générer loyers" button; table now shows a "Période" column distinguishing generated charges (YYYY-MM badge) from manual entries.
- Impact: Active leases can now generate monthly rent obligations deterministically; duplicate generation for the same lease+month is blocked at DB level; overdue logic runs on page load; manual payment recording unchanged.
- Tests: Included in passing root `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.

## 2026-03-31
- Change type: Frontend
- Description: Refocused leases dashboard page on read-side lease information only by removing in-page lease creation/assignment controls and deleting related unused form/types wiring.
- Impact: Lease assignment now lives on unit detail flow; leases page now serves status-filtered lease visibility (summary + table) without duplicate assignment entry point or lingering dead UI code.
- Tests: Included in passing root `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.

## 2026-03-31
- Change type: API
- Description: Expanded detail-route test coverage with one happy-path GET case for each hardened manager route family: properties, tenants, leases, units, maintenance, and payments.
- Impact: Route coverage is now less failure-path-heavy, giving a basic safety net for successful operator retrieval flows across the main detail endpoints without widening runtime scope.
- Tests: Included in passing root `pnpm test`, `pnpm lint`, `pnpm typecheck`, and `pnpm build`.

## 2026-03-31
- Change type: API
- Description: Hardened payment detail GET route with operator-only access enforcement and added lightweight payment detail route tests covering tenant-role rejection on `GET` and invalid `paidDate` validation on `PATCH`.
- Impact: Payment detail endpoints now match the same route-level safety pattern as properties, tenants, leases, units, and maintenance, removing the last remaining session-only detail GET among core manager routes.
- Tests: Included in passing root `pnpm test`, `pnpm lint`, `pnpm typecheck`, and `pnpm build`.

## 2026-03-31
- Change type: API
- Description: Hardened unit detail route with operator-only access enforcement and explicit PATCH validation, and extended maintenance detail GET to the same operator guard. Added lightweight detail-route tests for `/api/units/[id]` and `/api/maintenance/[id]` covering tenant-role rejection and invalid PATCH payloads.
- Impact: Unit and maintenance detail endpoints now follow the same route-level safety pattern as properties, tenants, and leases, removing remaining session-only detail access and preventing silent fallback on invalid unit status updates.
- Tests: Included in passing root `pnpm test`, `pnpm lint`, `pnpm typecheck`, and `pnpm build`.

## 2026-03-31
- Change type: API
- Description: Hardened tenant and lease detail routes with operator-only access enforcement and explicit PATCH validation. Added lightweight tests covering tenant-role rejection and invalid PATCH payloads for both `/api/tenants/[id]` and `/api/leases/[id]`.
- Impact: Week 2 now extends the same safe detail-route guard/validation pattern used for properties to tenant and lease records, removing session-only access on these endpoints and preventing silent fallback behavior on invalid lease updates.
- Tests: Included in passing root `pnpm test`, `pnpm lint`, `pnpm typecheck`, and `pnpm build`.

## 2026-03-31
- Change type: API
- Description: Added lightweight access-control sanity coverage for operator dashboard and middleware redirects. Created tests for dashboard layout redirects (unauthenticated and tenant) plus middleware redirect behavior for unauthenticated dashboard access and authenticated login access.
- Impact: Week 1 Lite stabilization now covers both route-level property protections and top-level shell/navigation access control, reducing regression risk on the main operator entry flow.
- Tests: Included in passing root `pnpm test`, `pnpm lint`, `pnpm typecheck`, and `pnpm build`.

## 2026-03-31
- Change type: Infra
- Description: Started Week 1 Lite stabilization pass. Replaced root placeholder quality scripts with real workspace commands, added minimal web-manager test harness (Vitest), and created initial API route tests for properties (POST and detail route guard/validation cases).
- Impact: Quality commands now execute real checks from repo root (`lint`, `typecheck`, `test`, `build`). Properties route coverage now includes success/auth/forbidden/validation paths with lightweight tests to prevent regressions while keeping scope small.
- Tests: `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass from root.

## 2026-03-31
- Change type: Other
- Description: Split `project-context.md` into focused on-demand docs under `docs/context/` (`roles-and-auth`, `features-tenant`, `features-manager`, `features-owner-admin`, `brand`) and slimmed `project-context.md` to core product/architecture context plus links. Updated workspace `.claude/CLAUDE.md` to keep ADR docs on-demand only (no auto-injection).
- Impact: Agent context loading is lighter by default, while detailed role/feature/brand guidance remains available by targeted file reads.
- Tests: N/A (documentation and agent-instruction update only).

## 2026-03-31
- Change type: Frontend
- Description: Fixed onboarding build blocker by converting `/onboarding` page from client-side `useSearchParams` usage to server-side `searchParams` props.
- Impact: Next.js production build no longer fails with missing Suspense boundary error on onboarding prerender.
- Tests: Included in root `pnpm build` pass.

## 2026-03-30
- Change type: Feature
- Description: Implemented document management system (Slice 5) with DB migration `0006_init_documents.sql`, domain entities, API contracts, data-access repository, API routes (`/api/documents`, `/api/documents/[id]`), and frontend dashboard page with document upload/list/delete. Documents support 6 types (lease_agreement, receipt, notice, id, contract, other) and attach to 4 entity types (property, unit, tenant, lease). Created `DocumentManagementPanel` component with filtering, type badges, and file metadata display. Added documents link to sidebar navigation.
- Impact: Users can now upload, view, filter, and delete documents attached to properties, units, tenants, or leases. Document metadata tracked in DB (filename, URL, size, MIME type, document type, attachment info, uploader). UI provides type filtering and visual organization.
- Tests: Migration applied successfully (`0006_init_documents.sql`), TypeScript compilation passed with no errors.

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