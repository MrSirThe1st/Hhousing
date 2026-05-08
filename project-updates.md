# Project Updates

Use this file as the first project memory source before searching the codebase.

## 2026-04-19 (Late Evening)
- Change type: DB + Security Hardening (RLS Policy Model Correction)
- Description: Removed blanket/global deny RLS policies from shared app tables and switched to explicit allow-only model (implicit deny by default). This fixes authenticated user read-path regressions (notably login/account routing that depends on `organization_memberships` reads via Supabase client).
- Impact: Added `db/migrations/0044_drop_global_deny_rls_policies.sql`; dropped all `deny_*` policies created by baseline migration while keeping explicit org-scoped allow policies.
- Tests: `pnpm -C apps/web-manager typecheck` ✓; Supabase verification query confirms zero `deny%` policies remaining; security advisors now show only 3 expected `rls_enabled_no_policy` infos (`audit_logs`, `finance_ledger_accounts`, `finance_ledger_categories`) + 1 auth warning (`auth_leaked_password_protection`).

## 2026-04-20
- Change type: Frontend + Invoices UX
- Description: Refactored manager invoices UI into a more realistic invoice workflow with row-click detail opening, issuer/tenant context, and menu-based row actions (download + void) instead of inline void controls.
- Impact: Updated `apps/web-manager/src/app/dashboard/invoices/page.tsx` to load organization metadata and pass it to the panel; updated `apps/web-manager/src/components/invoice-management-panel.tsx` with branded invoice header (company + logo), action-menu controls in the Actions column, full-row click behavior, and printable/downloadable invoice output.
- Tests: `pnpm -C apps/web-manager typecheck` ✓.

## 2026-04-20
- Change type: API + Email + Invoices
- Description: Added shared invoice document template mirroring real-world invoice structure and reused it for manager downloads plus tenant paid-invoice emails with downloadable attachment.
- Impact: Added `apps/web-manager/src/lib/invoices/invoice-document.ts`; updated `apps/web-manager/src/components/invoice-management-panel.tsx` to render/download from shared template; updated `apps/web-manager/src/api/payments/payment.ts` to generate invoice HTML email + attach invoice file; updated `apps/web-manager/src/lib/email/resend.ts` with raw-HTML sender; updated `apps/web-manager/src/app/api/payments/[id]/route.ts` to use raw HTML sender for invoice delivery.
- Tests: `pnpm -C apps/web-manager typecheck` ✓, `pnpm -C apps/web-manager exec vitest run 'src/app/api/payments/[id]/route.test.ts' 'src/api/invoices/invoice.test.ts'` ✓.

## 2026-04-19 (Evening)
- Change type: DB + Security Hardening (RLS Baseline Policies)
- Description: Completed 4-phase RLS enablement across all 37 public tables + created comprehensive baseline RLS policies for all 111 table-objects (27 tables × org-scoped policies + 21 complex join-scoped policies + helper function). All 4 phases applied and validated green (25/25 smoke tests pass on org, team, invites, templates routes; typecheck clean; advisors show 0 `rls_disabled_in_public`, 111 `rls_enabled_no_policy`). New baseline policies implement org-scoped READ-only posture for authenticated users + deny-all for writes, with service-role-only bypass (server-side API access unaffected by `rolbypassrls=true` on postgres role). Helper function `user_org_ids()` centralizes org membership check for all policies.
- Impact: All 4 phases applied (0038-0041), validated passing. Created `db/migrations/0042_baseline_rls_policies_service_role_only.sql` with 111 baseline policies organized by phase grouping + metadata tables.
- Tests: Phase 1: 25/25 tests pass, typecheck clean. Phase 2: 25/25 tests pass, typecheck clean. Phase 3: 25/25 tests pass, typecheck clean. Phase 4: 25/25 tests pass, typecheck clean. Post-Phase-4 advisors: 0 `rls_disabled_in_public` + 111 `rls_enabled_no_policy`.

## 2026-04-19
- Change type: DB + Security Hardening
- Description: Added phased migrations to enable RLS safely across all `public` tables in four rollout waves (support/invites, collaboration/listings, finance/workflows, then core/auth tables).
- Impact: Added `db/migrations/0038_enable_rls_phase_1_support_and_invites.sql`, `db/migrations/0039_enable_rls_phase_2_collaboration_and_listings.sql`, `db/migrations/0040_enable_rls_phase_3_finance_and_workflows.sql`, and `db/migrations/0041_enable_rls_phase_4_core_entities_and_auth.sql`.
- Tests: All 4 phases validated passing with 25/25 smoke tests ✓, typecheck clean ✓.

## 2026-04-18
- Change type: Web + Team UX
- Description: Improved team members display from card-based layout to a clean table UI with columns for member name, contact status, email, and role. Added action buttons in the table for managers to configure member roles directly.
- Impact: Updated `apps/web-manager/src/components/team-management-panel.tsx` to render members in a responsive table instead of card layout with status badge, role tags, and inline configure button.
- Tests: `pnpm -C apps/web-manager typecheck` ✓, `pnpm -C apps/web-manager lint` ✓, `pnpm -C apps/web-manager build` ✓.

## 2026-04-18
- Change type: Web + API + Auth UX
- Description: Added operator self-profile flow with header avatar entry and moved logout action out of organization settings into the user profile page. Tightened organization settings write authority to account owner only, and removed transitional non-owner full-access fallback in dashboard access resolution.
- Impact: Added `apps/web-manager/src/app/dashboard/profile/page.tsx`, `apps/web-manager/src/components/operator-profile-panel.tsx`, `apps/web-manager/src/components/dashboard-user-avatar-link.tsx`; updated `apps/web-manager/src/app/dashboard/layout.tsx`, `apps/web-manager/src/app/dashboard/organization/page.tsx`, `apps/web-manager/src/components/organization-settings-form.tsx`, `apps/web-manager/src/app/api/organization/route.ts`, and `apps/web-manager/src/lib/dashboard-access.ts`; updated tests in `apps/web-manager/src/app/api/organization/route.test.ts`.
- Tests: `pnpm lint` ✓, `pnpm typecheck` ✓, `pnpm test` ✓, `pnpm build` ✓.

## 2026-04-18
- Change type: Web + Permissions + Tests
- Description: Removed landlord-specific dashboard access shortcut and aligned section authority to account-owner semantics plus explicit permission checks. Also fixed stale route test mocks for property client reassignment to include membership context required by audit actor resolution.
- Impact: Updated `apps/web-manager/src/lib/dashboard-access.ts` (operator-wide account-owner access model), updated `apps/web-manager/src/app/api/properties/[id]/client/route.test.ts` (session membership mock shape).
- Tests: `pnpm lint` ✓, `pnpm typecheck` ✓, `pnpm test` ✓, `pnpm build` ✓.

## 2026-04-18
- Change type: Web + API + Permissions
- Description: Refactored team admin-assignment authority to remove landlord-only hardcoding. ADMIN function assignment now depends on explicit authority (account owner or organization-admin permission), and Team UI messaging now reflects that model.
- Impact: Updated `apps/web-manager/src/api/organizations/team-members.ts` escalation checks, `apps/web-manager/src/app/dashboard/team/page.tsx` admin-assignability computation, `apps/web-manager/src/components/team-management-panel.tsx` admin gating copy, and `docs/context/roles-and-auth.md` authority wording.
- Tests: `pnpm -C apps/web-manager typecheck` ✓, `pnpm -C apps/web-manager exec vitest run 'src/app/api/organizations/members/[id]/functions/route.test.ts'` ✓.

## 2026-04-18
- Change type: API + Audit Coverage Hardening
- Description: Completed exhaustive operator-side audit instrumentation across remaining mutation routes/services. Added audit events for owner/client create-update-invite, tenant update/delete/invite, document upload-delete, listings upsert, application review + convert, tasks create-update-delete, calendar events create-update-delete, organization settings update + organization creation, email templates create-update-delete, property update-delete-owner reassignment, unit update-delete, lease update/finalize/draft-email/invite-resend, invoice void, and manager conversation start/send.
- Impact: Updated service-layer modules `apps/web-manager/src/api/properties/owner-clients.ts`, `apps/web-manager/src/api/owners/owner-invitations.ts`, `apps/web-manager/src/api/tenants/tenant-invitations.ts`, `apps/web-manager/src/api/documents/document.ts`, `apps/web-manager/src/api/leases/move-out.ts`, `apps/web-manager/src/api/invoices/invoice.ts`, `apps/web-manager/src/api/messages/message.ts`, `apps/web-manager/src/api/organizations/create-organization.ts`; updated route handlers under `apps/web-manager/src/app/api/**` for listings, applications, tasks, calendar-events, organization, email-templates, tenants/[id], units/[id], properties/[id], properties/[id]/client, leases/[id], and move-out routes; improved shared helper `apps/web-manager/src/api/audit-log.ts` to accept either session-based or explicit organization/member context.
- Tests: `pnpm -C apps/web-manager typecheck` ✓, `pnpm -C apps/web-manager exec vitest run src/app/api/organization/route.test.ts src/app/api/organizations/members/route.test.ts 'src/app/api/payments/[id]/route.test.ts' 'src/app/api/tenants/[id]/route.test.ts' 'src/app/api/units/[id]/route.test.ts src/api/leases/lease.test.ts src/api/tenants/create-tenant.test.ts` ✓.

## 2026-04-18
- Change type: Web + API + Audit Coverage
- Description: Expanded audit logging beyond team-management actions into core platform mutations so the new Audit page now captures main operations, finance, and services activity. Property, unit, tenant, lease, payment, expense, and maintenance create/update/delete-style flows now emit non-blocking operator audit events with entity references and contextual metadata.
- Impact: Added shared audit helper `apps/web-manager/src/api/audit-log.ts`; updated `apps/web-manager/src/api/payments/payment.ts`, `apps/web-manager/src/api/expenses/expense.ts`, `apps/web-manager/src/api/maintenance/maintenance-request.ts`, `apps/web-manager/src/api/properties/create-property.ts`, `apps/web-manager/src/api/tenants/create-tenant.ts`, `apps/web-manager/src/api/leases/lease.ts`, and `apps/web-manager/src/api/units/create-unit.ts`; updated `apps/web-manager/src/api/tenants/create-tenant.test.ts` to match the current tenant payload contract.
- Tests: `pnpm -C apps/web-manager typecheck` ✓, `pnpm -C apps/web-manager exec vitest run src/api/properties/create-property.test.ts src/api/tenants/create-tenant.test.ts src/api/leases/lease.test.ts 'src/app/api/payments/[id]/route.test.ts' src/app/api/organizations/members/route.test.ts src/app/api/organization/route.test.ts` ✓.

## 2026-04-18
- Change type: Web + Permissions + Team UX
- Description: Started the team-access redesign toward employee presets and section-scoped navigation. Team invite now ignores ownership capability (`canOwnProperties` forced to false), the team page now has an explicit read-only employee view (self info + team directory), preset labels were aligned to business-facing names (Property Manager, Accountant, Maintenance Technician, Admin), and dashboard sidebar sections are now permission-aware with a founding-manager-only Audit nav entry.
- Impact: Updated `packages/api-contracts/src/auth/memberships.validation.ts`, `apps/web-manager/src/components/team-management-panel.tsx`, `apps/web-manager/src/app/dashboard/team/page.tsx`, `apps/web-manager/src/components/sidebar.tsx`, `apps/web-manager/src/app/dashboard/layout.tsx`; added `apps/web-manager/src/app/dashboard/audit/page.tsx`; updated `apps/web-manager/src/app/api/organizations/members/route.test.ts`.
- Tests: `pnpm -C apps/web-manager typecheck` ✓, `pnpm -C apps/web-manager exec vitest run src/app/api/organizations/members/route.test.ts` ✓.

## 2026-04-18
- Change type: Web + DB + Permissions + Audit
- Description: Added the first real audit backend and centralized dashboard section access enforcement. A new `audit_logs` table now stores team-management events (invite, resend, revoke, preset updates), the Audit page lists events by day for the founding manager only, and shared dashboard access resolution now gates direct route access across dashboard, operations, finances, services, and organization surfaces.
- Impact: Added migration `db/migrations/0037_init_audit_logs.sql`; added audit repository in `packages/data-access/src/audit/*` and exports/factory wiring in `packages/data-access/src/index.ts` + `apps/web-manager/src/app/api/shared.ts`; updated `apps/web-manager/src/api/organizations/team-members.ts` to write non-blocking audit events; added shared access helper `apps/web-manager/src/lib/dashboard-access.ts`; updated dashboard routes across operations/finances/services/organization to use centralized section guards; updated `apps/web-manager/src/app/dashboard/audit/page.tsx` to read real audit data.
- Tests: `pnpm -C apps/web-manager typecheck` ✓, `pnpm -C apps/web-manager exec vitest run src/app/api/organizations/members/route.test.ts src/app/api/organization/route.test.ts src/app/dashboard/layout.test.tsx` ✓.

## 2026-04-18
- Change type: API + Data-access + Payments/Invoices
- Description: Switched paid-invoice email delivery from queued `auto_on_paid` jobs to immediate send in the mark-paid payment flow; invoice email status is now updated directly to `sent` or `failed` after delivery attempt.
- Impact: Updated `apps/web-manager/src/api/payments/payment.ts` (direct send path + deps), `apps/web-manager/src/app/api/payments/[id]/route.ts` (email sender/tenant/org deps wiring), `packages/data-access/src/invoices/postgres-invoice.repository.ts` (removed auto queue insert from `syncInvoiceForPaidPayment`, added `markInvoiceEmailSent/markInvoiceEmailFailed`), and `packages/data-access/src/invoices/invoice-record.types.ts` (contract updates).
- Tests: `pnpm -C apps/web-manager typecheck` ✓; `pnpm -C apps/web-manager test -- 'src/app/api/payments/[id]/route.test.ts'` ran and surfaced 1 unrelated existing failure in `src/api/tenants/create-tenant.test.ts`.

## 2026-04-18
- Change type: API + Frontend + Contracts + Data-access
- Description: Removed invoice email queue remnants from runtime paths and UI: send/resend queue actions, queue parser/types, queue processor route, and invoice detail email-job history panel are now removed.
- Impact: Updated `apps/web-manager/src/components/invoice-management-panel.tsx` (removed send/resend buttons and email-job history section), `apps/web-manager/src/api/invoices/invoice.ts` + `apps/web-manager/src/app/api/invoices/[id]/route.ts` + `apps/web-manager/src/api/index.ts` (removed queue action/service/export), `packages/api-contracts/src/invoices/*` + `packages/api-contracts/src/index.ts` (removed queue contracts/parser and `emailJobs` from detail output), `packages/data-access/src/invoices/*` + `packages/data-access/src/index.ts` (removed queue interfaces/methods and invoice-detail emailJobs payload), and deleted `apps/web-manager/src/app/api/internal/invoices/process-email-jobs/route.ts`.
- Tests: `pnpm -C apps/web-manager typecheck` ✓; `pnpm -C apps/web-manager exec vitest run src/api/invoices/invoice.test.ts 'src/app/api/payments/[id]/route.test.ts'` ✓.

## 2026-04-16
- Change type: Infra + Invoicing
- Description: Added a deployment cron for invoice email job processing so queued invoice emails are periodically claimed and sent.
- Impact: Updated `apps/web-manager/vercel.json` to schedule `/api/internal/invoices/process-email-jobs` every 10 minutes; existing queue processor route and Resend envs remain unchanged.
- Tests: not run (deployment scheduler config only).

## 2026-04-17
- Change type: Infra
- Description: Removed unsupported 10-minute invoice email cron from Vercel config to restore deployability on Hobby plan. Invoice emails remain queued for background processing; process route still available for manual/future async triggers.
- Impact: Removed `/api/internal/invoices/process-email-jobs` cron from `apps/web-manager/vercel.json` (Hobby max once-daily). Monthly recurring payment cron unchanged. Invoice queue system unchanged for now.
- Tests: not run (Vercel config only).

## 2026-04-16
- Change type: Frontend + Payments/Invoices UX
- Description: Added effective client-side filters to manager payments and invoices workspaces, including text search, entity/status selectors, and due-date range filtering (`du` / `au`) to display records within a specific period.
- Impact: Updated `apps/web-manager/src/components/payment-management-panel.tsx` with filters for search, lease, payment type, status chips, and due-date range; updated `apps/web-manager/src/components/invoice-management-panel.tsx` with filters for search, lease, invoice status, email status, and due-date range, with summaries now reflecting the filtered dataset.
- Tests: `pnpm -C apps/web-manager typecheck` ✓.

## 2026-04-16
- Change type: Frontend + Payments UX
- Description: Replaced payments-page inline mark-paid loading with the shared full-screen centered material-wave overlay for both payment registration and mark-paid mutations.
- Impact: Updated `apps/web-manager/src/components/payment-management-panel.tsx` to drive a single full-screen `UniversalLoadingState` overlay from create-payment and mark-paid busy state and removed the inline `...` action label.
- Tests: `pnpm -C apps/web-manager typecheck` ✓.

## 2026-04-16
- Change type: Full-stack + Invoicing Follow-up
- Description: Added invoice void flow, detail drawer UX with retry/application history, and action routing for send/resend/void from invoice detail.
- Impact: Extended invoice contracts with void input/output in `packages/api-contracts/src/invoices/*`; added `voidInvoice` repository behavior with credit adjustment in `packages/data-access/src/invoices/postgres-invoice.repository.ts`; added invoice service `voidInvoice` in `apps/web-manager/src/api/invoices/invoice.ts`; updated `apps/web-manager/src/app/api/invoices/[id]/route.ts` PATCH action dispatch (`send|resend|void`); upgraded `apps/web-manager/src/components/invoice-management-panel.tsx` with right-side detail panel, retry history display, payment applications list, and void reason workflow + warning.
- Tests: `pnpm -C apps/web-manager typecheck` ✓.

## 2026-04-16
- Change type: Full-stack + Invoicing Foundation
- Description: Implemented first invoicing slice with lease-period invoices, payment-to-invoice synchronization (issued/partial/paid), overpayment credit tracking, async email queue with retry states, and manager invoices workspace.
- Impact: Added migration `db/migrations/0036_init_invoices.sql` (`invoices`, `invoice_payment_applications`, `lease_credit_balances`, `invoice_email_jobs`); added domain `packages/domain/src/entities/invoice.types.ts`; added API contracts `packages/api-contracts/src/invoices/invoice.types.ts` + `invoice.validation.ts`; added data-access invoice repository in `packages/data-access/src/invoices/*`; wired invoice repo factories in `packages/data-access/src/index.ts` + `apps/web-manager/src/app/api/shared.ts`; extended mark-paid service flow in `apps/web-manager/src/api/payments/payment.ts` + `apps/web-manager/src/app/api/payments/[id]/route.ts` to sync invoices/credits and auto-queue paid-email jobs; added invoice APIs `apps/web-manager/src/api/invoices/invoice.ts`, routes `apps/web-manager/src/app/api/invoices/route.ts`, `apps/web-manager/src/app/api/invoices/[id]/route.ts`; added async job processor route `apps/web-manager/src/app/api/internal/invoices/process-email-jobs/route.ts`; added manager UI `apps/web-manager/src/app/dashboard/invoices/page.tsx`, `apps/web-manager/src/app/dashboard/invoices/loading.tsx`, `apps/web-manager/src/components/invoice-management-panel.tsx`; added sidebar entry in `apps/web-manager/src/components/sidebar.tsx`.
- Tests: `pnpm -C apps/web-manager typecheck` ✓.

## 2026-04-16
- Change type: Frontend + Expenses UX
- Description: Replaced inline expense-entry panel with a popup form to reduce page crowding; form now opens from add-expense CTA and auto-opens in edit mode from ledger actions.
- Impact: Updated `apps/web-manager/src/components/expense-create-form.tsx` with `displayMode` (`inline`|`modal`) and modal open/close flow; updated `apps/web-manager/src/app/dashboard/expenses/page.tsx` to mount the form as a modal trigger in the header and remove inline two-column form layout.
- Tests: `pnpm -C apps/web-manager typecheck` ✓.

## 2026-04-16
- Change type: Frontend + UX Loading Behavior
- Description: Switched dashboard documents route initial load to skeleton and centralized side-operation loading into a full-screen material-wave overlay.
- Impact: Updated `apps/web-manager/src/app/dashboard/documents/loading.tsx` to use `TableSkeleton`; updated `apps/web-manager/src/components/documents-workspace-panel.tsx` to show a fixed overlay `UniversalLoadingState` for upload/delete/template-save/email-send mutations and removed duplicate inline busy labels.
- Tests: `pnpm -C apps/web-manager typecheck` ✓.

## 2026-04-16
- Change type: Frontend + Lease UX Cleanup
- Description: Removed duplicate in-page lease email actions from lease detail; draft-email send and activation resend now live only in the dedicated lease emails workspace.
- Impact: Updated `apps/web-manager/src/app/dashboard/leases/[id]/lease-detail-client.tsx` to remove duplicate send/resend sections and related local state/handlers; updated `apps/web-manager/src/app/dashboard/leases/[id]/page.tsx` to drop now-unused selected-document prop wiring.
- Tests: `pnpm -C apps/web-manager typecheck` ✓.

## 2026-04-16
- Change type: Frontend + Lease Workflow Bugfix
- Description: Fixed lease detail runtime crash after saving lease draft where selectedDocumentIds was undefined and UI evaluated selectedDocumentIds.length.
- Impact: Updated `apps/web-manager/src/app/dashboard/leases/[id]/page.tsx` to pass `initialSelectedDocumentIds` derived from lease-attached documents; added defensive fallback in `apps/web-manager/src/app/dashboard/leases/[id]/lease-detail-client.tsx` to default to an empty array.
- Tests: `pnpm -C apps/web-manager typecheck` ✓.

## 2026-04-16
- Change type: Frontend + Email Workflow
- Description: Added a dedicated lease email workspace page and linked it from the lease action menu for draft-email sending with document selection and activation-email resend.
- Impact: Added `apps/web-manager/src/app/dashboard/leases/[id]/emails/page.tsx` and `apps/web-manager/src/app/dashboard/leases/[id]/emails/lease-email-workspace-client.tsx` (searchable/scrollable document selection UI for large file sets, send draft email action, resend activation action); updated `apps/web-manager/src/app/dashboard/leases/[id]/lease-detail-client.tsx` action menu with `Envoyer l'email du brouillon` entry and per-action status gating.
- Tests: `pnpm -C apps/web-manager typecheck` ✓.

## 2026-04-16
- Change type: Frontend + Workflow Guard
- Description: Added lease detail action menu (Move out + Ajouter un document), wired document upload popup trigger from menu, and restricted move-out actions/pages to active leases only.
- Impact: Updated `apps/web-manager/src/app/dashboard/leases/[id]/lease-detail-client.tsx` (new `ActionMenu` actions, active-only gating, external document upload trigger), updated `apps/web-manager/src/components/action-menu.tsx` (disabled links no longer navigate), updated `apps/web-manager/src/components/contextual-document-panel.tsx` (new external upload open signal), and updated `apps/web-manager/src/app/dashboard/leases/[id]/move-out/page.tsx` (server-side active lease guard).
- Tests: `pnpm -C apps/web-manager typecheck` ✓.

## 2026-04-16
- Change type: Frontend + Navigation
- Description: Moved lease move-out workflow to a dedicated page and added explicit navigation from lease detail.
- Impact: Added `apps/web-manager/src/app/dashboard/leases/[id]/move-out/page.tsx` and `apps/web-manager/src/app/dashboard/leases/[id]/move-out/move-out-flow-client.tsx`; updated `apps/web-manager/src/app/dashboard/leases/[id]/lease-detail-client.tsx` with a `Gérer le move-out` button linking to `/dashboard/leases/[id]/move-out` and disabled inline move-out rendering in lease detail.
- Tests: `pnpm -C apps/web-manager typecheck` ✓.

## 2026-04-16
- Change type: API + Frontend + Controls
- Description: Added move-out reconciliation controls to detect closure integrity issues and snapshot/live drift, with a dedicated endpoint and lease-detail visibility.
- Impact: Extended `apps/web-manager/src/api/leases/move-out.ts` with `buildMoveOutReconciliation` (blocking/warning/drift checks, closed snapshot integrity checks, closure event checks), added route `apps/web-manager/src/app/api/leases/[id]/move-out/reconciliation/route.ts` and tests `apps/web-manager/src/app/api/leases/[id]/move-out/reconciliation/route.test.ts`, and updated `apps/web-manager/src/app/dashboard/leases/[id]/lease-detail-client.tsx` to fetch/render reconciliation anomalies and refresh them after save/close actions.
- Tests: `pnpm -C apps/web-manager test -- 'src/app/api/leases/[id]/move-out/reconciliation/route.test.ts' 'src/app/api/leases/[id]/move-out/close/route.test.ts' 'src/app/api/leases/[id]/move-out/inspection/route.test.ts'` ✓, `pnpm -C apps/web-manager typecheck` ✓.

## 2026-04-16
- Change type: API + Frontend + Domain
- Description: Added move-out closure workflow with immutable snapshot finalization, ledger-bound closure id input, and lease-detail close action wiring.
- Impact: Extended move-out contracts/validation in `packages/api-contracts/src/leases/move-out.types.ts` and `packages/api-contracts/src/leases/move-out.validation.ts` (close input/output parser + exports), extended tenant-lease repository contract and postgres implementation with `closeMoveOut` in `packages/data-access/src/leases/tenant-lease-record.types.ts` and `packages/data-access/src/leases/postgres-tenant-lease.repository.ts`, added `closeLeaseMoveOut` service logic with snapshot hash in `apps/web-manager/src/api/leases/move-out.ts`, added close route `apps/web-manager/src/app/api/leases/[id]/move-out/close/route.ts`, wired close controls in `apps/web-manager/src/app/dashboard/leases/[id]/lease-detail-client.tsx`, and updated strict test mocks in `apps/web-manager/src/api/leases/lease.test.ts` and `apps/web-manager/src/api/tenants/create-tenant.test.ts`.
- Tests: `pnpm -C apps/web-manager exec vitest run 'src/app/api/leases/[id]/move-out/close/route.test.ts'` ✓, `pnpm -C apps/web-manager exec vitest run 'src/app/api/leases/[id]/move-out/inspection/route.test.ts'` ✓, `pnpm -C apps/web-manager typecheck` ✓.

## 2026-04-16
- Change type: API + Frontend + Tests
- Description: Completed move-out inspection workflow wiring and replaced lease-detail direct termination flow with move-out draft/confirmation + inspection save actions powered by the dedicated move-out endpoints.
- Impact: Updated `apps/web-manager/src/lib/api-client.ts` with `getWithAuth`; rebuilt `apps/web-manager/src/app/dashboard/leases/[id]/lease-detail-client.tsx` to load/save move-out and inspection state through `/api/leases/[id]/move-out` and `/api/leases/[id]/move-out/inspection`; added route tests in `apps/web-manager/src/app/api/leases/[id]/move-out/inspection/route.test.ts` covering auth failure, payload validation, and success.
- Tests: `pnpm -C apps/web-manager exec vitest run 'src/app/api/leases/[id]/move-out/inspection/route.test.ts'` ✓, `pnpm -C apps/web-manager typecheck` ✓.

## 2026-04-16
- Change type: Backend + Lease Workflow
- Description: Added dedicated move-out inspection persistence with structured checklist items, photo document references, service handling, and a lease-scoped inspection API endpoint.
- Impact: Updated `packages/domain/src/entities/move-out.types.ts` and `packages/domain/src/index.ts` to expose typed inspection checklist items; extended `packages/api-contracts/src/leases/move-out.types.ts`, `packages/api-contracts/src/leases/move-out.validation.ts`, and `packages/api-contracts/src/index.ts` with inspection input/output parsing; extended `packages/data-access/src/leases/tenant-lease-record.types.ts`, `packages/data-access/src/leases/postgres-tenant-lease.repository.ts`, and `packages/data-access/src/index.ts` with inspection upsert support; updated `apps/web-manager/src/api/leases/move-out.ts`; added `apps/web-manager/src/app/api/leases/[id]/move-out/inspection/route.ts`; updated strict repository mocks in `apps/web-manager/src/api/leases/lease.test.ts` and `apps/web-manager/src/api/tenants/create-tenant.test.ts`.
- Tests: `pnpm -C apps/web-manager typecheck` ✓.

## 2026-04-16
- Change type: Backend + Lease Workflow
- Description: Implemented the first move-out backend domain slice with shared types/contracts, repository support, settlement preview logic, and a dedicated lease move-out API route for reading and upserting move-out drafts/confirmed records plus manual charges.
- Impact: Added `packages/domain/src/entities/move-out.types.ts`; added `packages/api-contracts/src/leases/move-out.types.ts` and `packages/api-contracts/src/leases/move-out.validation.ts`; exported them from `packages/domain/src/index.ts` and `packages/api-contracts/src/index.ts`; extended `packages/data-access/src/leases/tenant-lease-record.types.ts`, `packages/data-access/src/leases/postgres-tenant-lease.repository.ts`, and `packages/data-access/src/index.ts` with move-out aggregate methods; added `apps/web-manager/src/api/leases/move-out.ts` and `apps/web-manager/src/app/api/leases/[id]/move-out/route.ts`; updated strict repository mocks in `apps/web-manager/src/api/leases/lease.test.ts` and `apps/web-manager/src/api/tenants/create-tenant.test.ts`.
- Tests: `pnpm -C apps/web-manager typecheck` ✓.

## 2026-04-16
- Change type: Web + Domain + Lease Billing
- Description: Added a shared monthly proration utility and wired move-in flows to auto-generate first-month prorated rent for monthly leases starting mid-month while shifting the first full recurring billing date to the next month.
- Impact: Added `packages/domain/src/proration/monthly-proration.types.ts` and `packages/domain/src/proration/calculate-monthly-proration.ts`, exported them from `packages/domain/src/index.ts`, updated `apps/web-manager/src/api/leases/lease.ts` to auto-create a one-time `prorated_rent` charge and normalize `paymentStartDate`/`dueDayOfMonth`, and updated `apps/web-manager/src/components/lease-move-in-form.tsx` to preview automatic proration and remove the manual prorated-rent entry path.
- Tests: `pnpm -C apps/web-manager typecheck` ✓.

## 2026-04-16
- Change type: DB + Finance Foundation
- Description: Added the initial finance-ledger and move-out schema foundation: ledger accounts, central category registry, ledger entries with DB-enforced posting rules, and core move-out tables with deterministic closure boundary fields and snapshot immutability guards.
- Impact: Added `db/migrations/0035_finance_ledger_and_move_out_foundation.sql` creating `finance_ledger_accounts`, `finance_ledger_categories`, `finance_ledger_entries`, `move_outs`, `move_out_charges`, and `move_out_inspections`, plus validation/update triggers for ledger posting rules, child org consistency, and closed move-out snapshot immutability.
- Tests: not run (schema migration added to repo; not applied in a database during this slice).

## 2026-04-16
- Change type: Web + Reporting + Finance Controls
- Description: Started finance-control implementation by enforcing operational revenue aggregation to exclude deposits, surfacing deposits as explicit liability totals in reporting surfaces, and adding a canonical finance controls context document.
- Impact: Updated `apps/web-manager/src/lib/finance-reporting.types.ts` and `apps/web-manager/src/lib/finance-reporting.ts` (deposit liability totals + operational revenue-only ledger aggregation), updated `apps/web-manager/src/app/dashboard/revenues/page.tsx`, `apps/web-manager/src/app/dashboard/reports/page.tsx`, and `apps/web-manager/src/app/reports/finance/print/page.tsx` to display deposits separately from revenues, added `docs/context/finance-controls.md`, and registered it in `project-context.md`.
- Tests: `pnpm -C apps/web-manager typecheck` ✓.

## 2026-04-16
- Change type: Web + Frontend + UX
- Description: Updated lease detail activation-email resend UX: button is now unavailable before lease finalization/activation and moved below the move-in finalization area.
- Impact: Updated `apps/web-manager/src/app/dashboard/leases/[id]/lease-detail-client.tsx` so resend is enabled only when lease status is `active`; added pending-state helper text; repositioned the "Accès locataire" block below the finalization section.
- Tests: `pnpm -C apps/web-manager typecheck` ✓.

## 2026-04-16
- Change type: Web + Frontend + UX
- Description: Restored direct navigation to lease detail by clicking a lease row in the leases table.
- Impact: Updated `apps/web-manager/src/components/lease-management-panel.tsx` so each row opens `/dashboard/leases/[id]` on click/Enter/Space (keyboard accessible), while preserving tenant-name link behavior.
- Tests: `pnpm -C apps/web-manager typecheck` ✓.

## 2026-04-16
- Change type: Web + Frontend + UX
- Description: Replaced inline loading labels with full-screen centered material-wave overlays for lease draft registration and lease finalization/activation flows.
- Impact: Updated `apps/web-manager/src/components/lease-move-in-form.tsx` to show `UniversalLoadingState` overlay during draft save (`busy`) and updated `apps/web-manager/src/app/dashboard/leases/[id]/lease-detail-client.tsx` to show the same overlay during finalization (`finalizing`).
- Tests: `pnpm -C apps/web-manager typecheck` ✓.

## 2026-04-15
- Change type: Web + Access Scope Bugfix
- Description: Fixed tenant detail page false "Locataire introuvable" for newly created tenants without leases.
- Impact: Updated [apps/web-manager/src/app/dashboard/tenants/[id]/page.tsx](apps/web-manager/src/app/dashboard/tenants/[id]/page.tsx) to align with API access rule: tenant is visible if in scoped tenant IDs OR if the tenant has no organization lease yet.
- Tests: `pnpm -C apps/web-manager typecheck` ✓.

## 2026-05-01
- Change type: Full-stack (DB + domain + api-contracts + data-access + web-manager)
- Description: Unified tenant profile and listing application fields across all three surfaces (tenant create, tenant detail/edit, public listing application form). Added 4 new DB columns to `tenants` (employment_status, job_title, monthly_income, number_of_occupants) and 4 to `listing_applications` (date_of_birth, employment_status, job_title, number_of_occupants). Migration: `db/migrations/0034_tenant_and_application_extended_fields.sql` (must be applied to DB). The "convert application → tenant" route (`/api/applications/[id]/convert`) now copies employment_status, job_title, numberOfOccupants from the application into the new tenant automatically.
- Impact: `db/migrations/0034_...sql`; `packages/domain` (tenant.types, listing-application.types); `packages/api-contracts` (tenant-lease.types/validation, listing.types/validation); `packages/data-access` (tenant-lease-record.types, listing-record.types, postgres-tenant-lease.repository, postgres-listing.repository); `apps/web-manager` (tenant-management.types, create-tenant service, tenants/[id] PATCH route, applications/[id]/convert route, tenant-create-form, tenant-detail-client, public-listing-application-form).
- Tests: `pnpm lint` ✓, `pnpm typecheck` ✓.

## 2026-04-15
- Change type: Web + Frontend + UX
- Description: Added structured listings filters, restored explicit listing save/publish actions, and aligned listing detail route loading to platform skeletons.
- Impact: Updated `apps/web-manager/src/components/listing-management-panel.tsx` listings tab with properties-style filter controls (search, status, city, property); updated `apps/web-manager/src/components/listing-editor-form.tsx` with `Save edits` and `Publish listing` actions plus full-screen `UniversalLoadingState` overlay during save/publish; updated `apps/web-manager/src/app/dashboard/listings/[unitid]/loading.tsx` to use `TableSkeleton` instead of the universal loader.
- Tests: `pnpm -C apps/web-manager lint` ✓, `pnpm -C apps/web-manager typecheck` ✓.

## 2026-04-15
- Change type: Web + Frontend + UX
- Description: Switched owner creation loading on `/dashboard/clients/add` from inline button text to a full-screen centered material-wave overlay.
- Impact: Updated `apps/web-manager/src/components/owner-client-create-panel.tsx` to render `UniversalLoadingState` in a fixed overlay when submit is in-flight and removed inline `Création...` button text.
- Tests: `pnpm -C apps/web-manager lint` ✓, `pnpm -C apps/web-manager typecheck` ✓.

## 2026-04-15
- Change type: Web + Frontend + UX
- Description: Updated property/unit creation to use full-screen centered material-wave loading overlays and removed the unused actions button column from the portfolio properties table.
- Impact: Updated `apps/web-manager/src/components/property-create-form.tsx` and `apps/web-manager/src/components/unit-create-form.tsx` to render `UniversalLoadingState` in a fixed overlay during submit flows (no inline submit loading text); updated `apps/web-manager/src/components/property-management-panel.tsx` to remove the properties-table action menu column.
- Tests: `pnpm -C apps/web-manager lint` ✓, `pnpm -C apps/web-manager typecheck` ✓.

## 2026-04-15
- Change type: Web + Frontend + UX
- Description: Rolled back unintended portfolio navigation loading overlay, removed inline owner-client creation from property add, and added explicit icon+label field guidance on property/unit add forms.
- Impact: Updated `apps/web-manager/src/components/property-management-panel.tsx` to remove route-navigation loading overlay hooks; updated `apps/web-manager/src/components/property-create-form.tsx` to keep owner selection only (no create-on-the-fly owner client) and add platform-style icons/labels to all main form fields; updated `apps/web-manager/src/components/unit-create-form.tsx` to add platform-style icons beside existing field labels.
- Tests: `pnpm -C apps/web-manager lint` ✓, `pnpm -C apps/web-manager typecheck` ✓.

## 2026-04-15
- Change type: Web + Frontend + UX
- Description: Switched portfolio page action loading to a centered full-screen material-wave overlay so action-triggered navigation no longer relies on inline progress states.
- Impact: Updated `apps/web-manager/src/components/property-management-panel.tsx` to set a global action-busy state for portfolio CTAs, row navigation, inline links, and action-menu actions, then render `UniversalLoadingState` in a fixed overlay.
- Tests: `pnpm -C apps/web-manager lint` ✓, `pnpm -C apps/web-manager typecheck` ✓.

## 2026-04-15
- Change type: Web + Frontend + Reporting
- Description: Upgraded manager dashboard `Vue d'ensemble` into a true operational overview with financial KPIs (revenus encaissés, dépenses, net, encours en retard), collection signal, pending receivables, urgent maintenance count, and quick report entrypoints.
- Impact: Updated `apps/web-manager/src/app/dashboard/page.tsx` to aggregate scoped payments/expenses via existing finance helpers, compute overdue/pending/payment-status summaries, and replace the previous generic stat-only grid with denser finance + operations sections.
- Tests: `pnpm -C apps/web-manager typecheck` ✓, `pnpm -C apps/web-manager lint` ✓, `pnpm -C apps/web-manager build` ✓.

## 2026-04-15
- Change type: Web + Frontend + Reporting
- Description: Added a compact 6-month trend strip in dashboard overview showing monthly revenus, dépenses, and net.
- Impact: Extended `apps/web-manager/src/app/dashboard/page.tsx` metrics aggregation with month buckets over scoped payments/expenses and rendered a horizontally scrollable 6-column strip in `Vue d'ensemble`.
- Tests: `pnpm -C apps/web-manager typecheck` ✓, `pnpm -C apps/web-manager lint` ✓, `pnpm -C apps/web-manager build` ✓.

## 2026-04-15
- Change type: Web + Frontend + Operations
- Description: Added overdue payment prioritization and a manager-focused daily digest to the dashboard overview for immediate execution.
- Impact: Updated `apps/web-manager/src/app/dashboard/page.tsx` with overdue table rows (locataire, unité, montant, jours de retard) plus digest indicators/actions for urgent maintenance, overdue payments, and leases ending within 30 days.
- Tests: `pnpm -C apps/web-manager typecheck` ✓, `pnpm -C apps/web-manager lint` ✓, `pnpm -C apps/web-manager build` ✓.

## 2026-04-15
- Change type: Web + Frontend + Workflow
- Description: Fixed task creation related-entity selectors to include both owned and managed portfolio data, removed `Prendre en charge` action from task cards, and switched task mutations to centered material-wave loading overlay.
- Impact: Updated `apps/web-manager/src/lib/dashboard-workflow.ts` to build task related options from merged owned+managed properties/units/leases/tenants; updated `apps/web-manager/src/components/dashboard-tasks-panel.tsx` to remove in-progress takeover CTA and show full-screen `UniversalLoadingState` during task create/update/delete.
- Tests: `pnpm -C apps/web-manager typecheck` ✓, `pnpm -C apps/web-manager lint` ✓, `pnpm -C apps/web-manager build` ✓.

## 2026-04-15
- Change type: Web + Backend + Scope Cleanup
- Description: Started removing legacy `owned/managed` runtime filtering by unifying core scoped-portfolio reads to one accessible portfolio set.
- Impact: Updated `apps/web-manager/src/lib/operator-scope-portfolio.ts` to stop applying operator-scope filter and load properties with units for the full organization-accessible set; aligned `apps/web-manager/src/lib/dashboard-workflow.ts`, `apps/web-manager/src/app/dashboard/page.tsx`, and `apps/web-manager/src/app/dashboard/messages/page.tsx` to use the unified dataset without legacy scope filtering.
- Tests: `pnpm -C apps/web-manager typecheck` ✓, `pnpm -C apps/web-manager lint` ✓, `pnpm -C apps/web-manager build` ✓.

## 2026-04-15
- Change type: Web + API + Scope Cleanup
- Description: Continued legacy scope removal by dropping `managementContext/currentScope` filtering from key listing/unit/move-in/property endpoints and simplifying operator-context to read-only experience metadata.
- Impact: Updated `apps/web-manager/src/app/dashboard/listings/page.tsx`, `apps/web-manager/src/app/dashboard/listings/[unitId]/page.tsx`, `apps/web-manager/src/app/dashboard/units/add/page.tsx`, `apps/web-manager/src/app/dashboard/leases/move-in/page.tsx`, `apps/web-manager/src/app/api/properties/with-units/route.ts`, `apps/web-manager/src/app/api/properties/[id]/route.ts`, `apps/web-manager/src/lib/operator-context.ts`, `apps/web-manager/src/lib/operator-context.types.ts`, `apps/web-manager/src/app/api/operator-context/route.ts`, `apps/web-manager/src/app/api/operator-context/route.test.ts`, and `apps/web-manager/src/components/operator-scope-switcher.tsx`.
- Tests: `pnpm -C apps/web-manager typecheck` ✓, `pnpm -C apps/web-manager lint` ✓, `pnpm -C apps/web-manager build` ✓.

## 2026-04-15
- Change type: Web + Frontend + UX
- Description: Switched calendar tab action loading (create, update, delete) to the centered full-screen material-wave overlay.
- Impact: Updated `apps/web-manager/src/components/dashboard-calendar.tsx` to render a global busy overlay using `UniversalLoadingState` and removed inline mutation-specific busy labels.
- Tests: `pnpm -C apps/web-manager typecheck` ✓, `pnpm -C apps/web-manager lint` ✓, `pnpm -C apps/web-manager build` ✓.

## 2026-04-13
- Change type: Web + Owner Portal + Quality
- Description: Promoted `web-owner` from read-only preview toward production shape by adding owner statement CSV export (`/api/reports/export`), richer report summaries/detail tables, and French copy normalization; then stabilized quality gate by aligning outdated API tests with current invite/property-owner assignment behavior.
- Impact: Added `apps/web-owner/src/lib/owner-reporting.ts` and `apps/web-owner/src/app/api/reports/export/route.ts`; updated owner reports/dashboard/properties pages and manager dashboard mixed-language subtitle; updated `apps/web-manager` tests `src/app/api/organizations/members/route.test.ts` and `src/app/api/properties/[id]/client/route.test.ts`.
- Tests: `pnpm -C apps/web-owner typecheck` ✓, `pnpm -C apps/web-owner build` ✓, `pnpm -C apps/web-manager test -- 'src/app/api/organizations/members/route.test.ts' 'src/app/api/properties/[id]/client/route.test.ts'` ✓, `pnpm lint && pnpm typecheck && pnpm test && pnpm build` ✓.

## 2026-04-14
- Change type: Web + Owner Portal + Auth
- Description: Fixed owner-portal redirect loop (`/owner-portal/dashboard` <-> `/owner-portal/login`) by requiring active `owner_portal_accesses` in middleware before auto-redirecting authenticated users to owner dashboard.
- Impact: Updated `apps/web-manager/src/middleware.ts` owner-portal guards so `/owner-portal/invite` is always public, `/owner-portal/login` redirects only for users with active owner access, and `/owner-portal/dashboard*` now enforces both auth and owner access.
- Tests: `pnpm -C apps/web-manager lint` ✓, `pnpm -C apps/web-manager typecheck` ✓, `pnpm -C apps/web-manager build` ✓.

## 2026-04-14
- Change type: Web + Owner Portal + Frontend
- Description: Restructured owner portal dashboard shell with a dedicated sidebar navigation and tightened page separation so overview stays on dashboard while properties/payments/reports remain in dedicated pages.
- Impact: Added `apps/web-manager/src/components/owner-portal/sidebar.tsx`; updated `apps/web-manager/src/app/owner-portal/dashboard/layout.tsx` to a two-column sidebar + content shell; simplified `apps/web-manager/src/app/owner-portal/dashboard/page.tsx` with route-focused quick access blocks.
- Tests: `pnpm -C apps/web-manager lint` ✓, `pnpm -C apps/web-manager typecheck` ✓, `pnpm -C apps/web-manager build` ✓.

## 2026-04-14
- Change type: Web + Auth + Routing
- Description: Fixed login redirect mismatch where authenticated owner-only users hitting `/login` were sent to `/account-type`; middleware now prioritizes redirects by access type.
- Impact: Updated `apps/web-manager/src/middleware.ts` so `/login` and `/signup` redirect order is: manager memberships -> `/dashboard`, owner portal access -> `/owner-portal/dashboard`, otherwise -> `/account-type`.
- Tests: `pnpm -C apps/web-manager lint` ✓, `pnpm -C apps/web-manager typecheck` ✓, `pnpm -C apps/web-manager build` ✓.

## 2026-04-14
- Change type: Web + Cleanup
- Description: Removed deprecated standalone owner app after owner portal migration to web-manager.
- Impact: Deleted `apps/web-owner`; updated workspace docs in `README.md` and `Learning/architecture-book/10-repo-map-and-boundaries.md`; regenerated `pnpm-lock.yaml` to remove stale workspace importer.
- Tests: `pnpm lint` ✓, `pnpm typecheck` ✓, `pnpm test` ✓, `pnpm build` ✓.

## 2026-04-14
- Change type: Web + Auth + Owner Portal
- Description: Completed general login handoff for owners by routing post-auth flow back through middleware instead of hardcoding manager dashboard navigation.
- Impact: Updated `apps/web-manager/src/app/login/page.tsx` to `router.replace('/login')` after successful sign-in so middleware picks the correct destination (`/dashboard` vs `/owner-portal/dashboard`); added owner-only redirect coverage in `apps/web-manager/src/middleware.test.ts`.
- Tests: `pnpm -C apps/web-manager test -- src/middleware.test.ts` ✓, `pnpm -C apps/web-manager lint` ✓, `pnpm -C apps/web-manager build` ✓.

## 2026-04-13
- Change type: Web + API + Data
- Description: Fixed client-assignment failure on property update caused by invalid SQL alias usage in repository RETURNING clauses (`p.<column>` without `FROM properties p`).
- Impact: Updated `packages/data-access/src/properties/postgres-organization-property-unit.repository.ts` to qualify returned ownership columns with `properties.<column>` for create/update property flows.
- Tests: `pnpm -C apps/web-manager lint` ✓, `pnpm -C apps/web-manager test -- 'src/app/api/properties/[id]/client/route.test.ts'` ✗ blocked by unrelated existing failures in `src/app/api/organizations/members/route.test.ts` and legacy expectation drift in `src/app/api/properties/[id]/client/route.test.ts`.

## 2026-04-13
- Change type: Web + Frontend + API
- Description: Reworked manager owner-client assignment flow into dedicated routes. Client detail now exposes an `Actions` menu with edit and assignment/invitation entrypoints, assignment moved to `/dashboard/clients/[id]/assign` with explicit assign/unassign tables plus owner invitation, and added `/dashboard/clients/[id]/edit` with full profile update form.
- Impact: Updated client detail and portfolio components; added `client-assignment-workspace` and `owner-client-edit-form`; added `PATCH /api/owners/[id]` route/service and repository `updateOwner` support in `packages/data-access`.
- Tests: `pnpm -C apps/web-manager lint` ✓, `pnpm -C apps/web-manager test -- 'src/app/api/owners/[id]/route.test.ts' 'src/api/properties/create-property.test.ts' 'src/api/units/create-unit.test.ts'` ✗ blocked by unrelated pre-existing failures in `src/app/api/organizations/members/route.test.ts` and `src/app/api/properties/[id]/client/route.test.ts`.

## 2026-04-11
- Change type: Web + API + Permissions
- Description: Started the team-permission hardening rollout by extending the permission contract with property access, updating default team-function seeds, adding a backfill migration for existing org functions, and enforcing team-function checks on property, tenant, document, and tenant-invitation operator flows.
- Impact: Updated `packages/api-contracts/src/permissions.types.ts`, migrations `0010_seed_default_team_functions.sql` and `0033_expand_team_function_permissions.sql`, property/tenant/document service modules and API routes in `apps/web-manager/src/api` and `apps/web-manager/src/app/api`, plus affected dashboard server call sites and route/unit tests.
- Tests: `pnpm -C apps/web-manager typecheck` ✓, `pnpm -C apps/web-manager test -- 'src/api/properties/create-property.test.ts' 'src/api/tenants/create-tenant.test.ts' 'src/app/api/properties/route.test.ts' 'src/app/api/properties/[id]/route.test.ts' 'src/app/api/properties/[id]/client/route.test.ts' 'src/app/api/tenants/route.test.ts' 'src/app/api/tenants/[id]/route.test.ts' 'src/app/api/tenants/[id]/invite/route.test.ts'` ✓, `pnpm -C apps/web-manager lint` ✓, `rm -rf apps/web-manager/.next && pnpm -C apps/web-manager build` ✓.

## 2026-04-11
- Change type: Web + Frontend + Auth
- Description: Added a visible logout action to the manager organization settings page so operators can sign out directly from that workspace.
- Impact: Updated `apps/web-manager/src/app/dashboard/organization/page.tsx` and added `apps/web-manager/src/components/logout-button.tsx`.
- Tests: `pnpm -C apps/web-manager lint` ✓, `pnpm -C apps/web-manager typecheck` ✓, `pnpm -C apps/web-manager test` ✓, `rm -rf apps/web-manager/.next && pnpm -C apps/web-manager build` ✓.

## 2026-04-11
- Change type: Web + Frontend
- Description: Hid the manager messaging workspace from the dashboard sidebar so the route remains unavailable from navigation while messaging is still withheld from users.
- Impact: Updated `apps/web-manager/src/components/sidebar.tsx` to remove the `Messages` nav entry from the Services section.
- Tests: `pnpm -C apps/web-manager lint` ✓, `pnpm -C apps/web-manager typecheck` ✓.

## 2026-04-11
- Change type: Web + Frontend + API
- Description: Removed the obsolete manual recurring-charge generation flow from web-manager payments now that recurring invoice creation is handled by the automated internal billing job.
- Impact: Updated `apps/web-manager/src/components/payment-management-panel.tsx`, removed `/api/payments/generate`, deleted its route test, and pruned the unused payment-generation service/contracts in `apps/web-manager/src/api` and `packages/api-contracts`.
- Tests: `pnpm -C apps/web-manager lint` ✓, `pnpm -C apps/web-manager typecheck` ✓, `pnpm -C apps/web-manager test` ✓, `rm -rf apps/web-manager/.next && pnpm -C apps/web-manager build` ✓.

## 2026-04-10
- Change type: Web + Frontend
- Description: Made tenant table rows navigate directly to the tenant detail like the existing cards, moved tenant detail actions into the shared overflow menu, opened tenant document upload from a portfolio-style modal, and removed the `Réinitialiser` action from the portfolio property filters.
- Impact: Updated `apps/web-manager/src/components/tenant-management-panel.tsx`, `apps/web-manager/src/app/dashboard/tenants/[id]/tenant-detail-client.tsx`, and `apps/web-manager/src/components/property-management-panel.tsx`.
- Tests: `pnpm -C apps/web-manager lint` ✓, `pnpm -C apps/web-manager typecheck` ✓, `pnpm -C apps/web-manager test` ✓, `rm -rf apps/web-manager/.next && pnpm -C apps/web-manager build` blocked by unrelated missing routes `/api/applications/[id]` and `/api/auth/create-account` during Next page-data collection.

## 2026-04-10
- Change type: Web + Frontend
- Description: Added visible route and mutation loading feedback to the manager listings workspace without replacing the existing listings index skeleton. The listing editor detail route now has a loader, save/publish shows in-page progress during upload and navigation, and screening actions show row-level busy state.
- Impact: Added `apps/web-manager/src/app/dashboard/listings/[unitId]/loading.tsx`; updated `apps/web-manager/src/components/listing-editor-form.tsx` and `listing-management-panel.tsx`.
- Tests: pending.

## 2026-04-10
- Change type: Web + Performance + Architecture
- Description: Reduced dashboard navigation latency by removing cross-module badge-count queries from the shared dashboard layout, caching server-side session resolution per render, and loading sidebar badge counts asynchronously through a dedicated API route after the shell renders.
- Impact: Updated `apps/web-manager/src/app/dashboard/layout.tsx`, `apps/web-manager/src/components/sidebar.tsx`, and `apps/web-manager/src/lib/session.ts`; added `/api/sidebar/badge-counts` route and route tests.
- Tests: `pnpm -C apps/web-manager typecheck` ✓, `pnpm -C apps/web-manager test -- src/app/api/sidebar/badge-counts/route.test.ts` ✓, `rm -rf apps/web-manager/.next && pnpm -C apps/web-manager build` ✓.

## 2026-04-10
- Change type: Web + Performance + Architecture
- Description: Flattened the main dashboard detail-page waterfalls by moving property, unit, tenant, maintenance, and lease detail routes to server-first loading. Each route now resolves its primary data before render and hands hydrated state to a client component for edits and mutations.
- Impact: Added server/client splits for `apps/web-manager/src/app/dashboard/properties/[id]`, `units/[id]`, `tenants/[id]`, `maintenance/[id]`, and `leases/[id]`; added shared dashboard session helper `apps/web-manager/src/app/dashboard/detail-page-access.ts`.
- Tests: `pnpm -C apps/web-manager typecheck` ✓, `pnpm -C apps/web-manager test -- src/app/api/sidebar/badge-counts/route.test.ts src/app/dashboard/layout.test.tsx` ✓, `rm -rf apps/web-manager/.next && pnpm -C apps/web-manager build` ✓.

## 2026-04-10
- Change type: Web + Frontend
- Description: Flattened the web-manager unit detail layout after the initial redesign so the screen now uses section dividers, structured rows, and denser data presentation instead of stacking many decorative cards.
- Impact: Updated `apps/web-manager/src/app/dashboard/units/[id]/page.tsx` and captured the user's anti-card enterprise layout preference in memory.
- Tests: `pnpm -C apps/web-manager lint` ✓.

## 2026-04-10
- Change type: Web + Frontend
- Description: Reworked the web-manager unit detail page into a fuller read surface with property context, location, rent, deposit, bedrooms, bathrooms, surface, amenities, and features, and moved document upload behind an action-menu modal instead of mixing tenant/lease assignment into the unit screen.
- Impact: Updated `apps/web-manager/src/app/dashboard/units/[id]/page.tsx` and `apps/web-manager/src/components/contextual-document-panel.tsx`.
- Tests: `pnpm -C apps/web-manager lint` ✓.

## 2026-04-10
- Change type: Web + Frontend + Data
- Description: Fixed org-owned property owner display so portfolio filters and property views use the real organization name instead of the hardcoded `Organisation` fallback; also removed the generic owner-type suffix from the portfolio owner filter labels.
- Impact: Updated `packages/data-access/src/properties/postgres-organization-property-unit.repository.ts` and `apps/web-manager/src/components/property-management-panel.tsx`.
- Tests: `pnpm -C apps/web-manager lint` ✓.

## 2026-04-10
- Change type: Web + Frontend
- Description: Normalized owner-related manager UI copy to French on the portfolio, sidebar, owner workspace, owner detail, and invitation panel so visible labels no longer mix English `owner` strings into the French product surface.
- Impact: Updated `apps/web-manager/src/components/property-management-panel.tsx`, `sidebar.tsx`, `owner-invitation-panel.tsx`, `apps/web-manager/src/app/dashboard/layout.tsx`, `apps/web-manager/src/app/dashboard/clients/page.tsx`, and `apps/web-manager/src/app/dashboard/clients/[id]/page.tsx`.
- Tests: `pnpm -C apps/web-manager lint` ✓.

## 2026-04-10
- Change type: Web + Frontend
- Description: Refined the web-manager portfolio workspace by adding owner filtering on the properties tab, removing the dedicated owner/action table headers, and making property rows navigate directly to the property detail while keeping the overflow menu icon-only.
- Impact: Updated `apps/web-manager/src/components/property-management-panel.tsx` and `apps/web-manager/src/components/action-menu.tsx`.
- Tests: `pnpm -C apps/web-manager typecheck` ✓, `pnpm -C apps/web-manager lint` ✓.

## 2026-04-10
- Change type: Web + Frontend
- Description: Applied a broader web-manager dashboard UX consistency pass using the cleaner portfolio/property pattern. Main list workspaces now use stronger hierarchy, summary cards, and direct primary navigation from rows/cards instead of hiding `Voir la fiche` in menus; dashboard sections missing route loaders now show the shared material-wave loading state or an existing table skeleton.
- Impact: Updated `apps/web-manager/src/components/property-management-panel.tsx`, `tenant-management-panel.tsx`, `lease-management-panel.tsx`, `maintenance-management-panel.tsx`, and `client-portfolio-table.tsx`; updated `apps/web-manager/src/app/dashboard/properties/[id]/page.tsx`; and added route `loading.tsx` files under clients, documents, expenses, listings, messages, organization, reports, revenues, and team.
- Tests: `pnpm -C apps/web-manager lint` ✓, `pnpm -C apps/web-manager typecheck` ✓, `pnpm -C apps/web-manager test` ✓, `pnpm -C apps/web-manager build` ✓.

## 2026-04-10
- Change type: Web + Frontend
- Description: Reworked the web-manager owners workspace into the same cleaner admin hierarchy used on portfolio. The owners index now uses a structured header, KPI summary cards, and a table-based portfolio view, and owner creation moved behind a dedicated add route with a direct CTA.
- Impact: Updated `apps/web-manager/src/app/dashboard/clients/page.tsx`; added `apps/web-manager/src/app/dashboard/clients/add/page.tsx`; kept `apps/web-manager/src/components/owner-client-create-panel.tsx` as the creation surface behind the new route.
- Tests: `pnpm -C apps/web-manager lint` ✓, `pnpm -C apps/web-manager typecheck` ✓, `pnpm -C apps/web-manager test` ✓, `pnpm -C apps/web-manager build` ✓.

## 2026-04-10
- Change type: Web + Auth + Owner Portal
- Description: Completed the first owner-portal read slice as a separate `web-owner` app. The invite acceptance flow was already in place; this pass finished the read-only dashboard surface by adding dedicated owner pages for properties, payments, and reports, and hardened the owner app TS config for workspace package resolution.
- Impact: Added `apps/web-owner/src/app/dashboard/properties/page.tsx`, `apps/web-owner/src/app/dashboard/payments/page.tsx`, and `apps/web-owner/src/app/dashboard/reports/page.tsx`; updated `apps/web-owner/tsconfig.json`; and cleaned up owner login/invite/dashboard shell styling warnings.
- Tests: Validation still blocked locally because `apps/web-owner` has no installed `node_modules` (`pnpm -C apps/web-owner typecheck` fails before compilation with `tsc: command not found`).

## 2026-04-10
- Change type: Web + API + DB + Documents
- Description: Expanded the owner workflow into a real owner profile flow. Owners can now store profile details (contact name, address, company toggle, company name, country, city, state, phone, profile picture), the owners list/detail screens show that richer profile context, and owner-specific documents are now supported through the shared documents pipeline.
- Impact: Added migration `0031_expand_owners_and_owner_documents.sql`; extended owner domain/contracts/data-access mapping and creation validation; rebuilt `apps/web-manager/src/components/owner-client-create-panel.tsx`; replaced the stale owner detail route at `apps/web-manager/src/app/dashboard/clients/[id]/page.tsx`; and added `owner` as a valid document attachment type across shared validation and web-manager document scope handling.
- Tests: `pnpm -C apps/web-manager typecheck` ✓, `pnpm -C apps/web-manager test` ✓, `pnpm -C apps/web-manager lint` ✓, `pnpm -C apps/web-manager build` ✓.

## 2026-04-10
- Change type: Web + API + Data Model
- Description: Started the ownership-architecture cutover in web-manager. Introduced owner-first shared types/contracts, removed operator scope switching from the shell, unified portfolio reads across the app, and moved property creation onto explicit owner assignment while keeping repository SQL compatible with the current database schema.
- Impact: Added `packages/domain/src/entities/owner.types.ts`; updated shared property/domain/api/data-access shapes to expose `ownerId`, `ownerName`, and `ownerType`; removed dashboard scope switching in `apps/web-manager/src/app/dashboard/layout.tsx`; updated sidebar, properties, and owners surfaces; added migration draft `db/migrations/0030_unify_property_owners.sql`; and kept runtime compatibility by mapping the new owner model over existing `owner_clients` / `client_id` storage until the DB cutover is applied.
- Tests: `pnpm -C apps/web-manager lint` ✓, `pnpm -C apps/web-manager typecheck` ✓, `pnpm -C apps/web-manager test` ✓, `pnpm -C apps/web-manager build` ✓.

## 2026-04-10
- Change type: Web + Frontend
- Description: Fixed managed-client creation in the property create flow and added a direct client creation entry point on the manager clients page.
- Impact: Updated `apps/web-manager/src/components/property-create-form.tsx` to consume the owner-client API response correctly so select options keep stable ids, added `apps/web-manager/src/components/owner-client-create-panel.tsx`, and wired it into `apps/web-manager/src/app/dashboard/clients/page.tsx`.
- Tests: `pnpm -C apps/web-manager lint` ✓, `pnpm -C apps/web-manager typecheck` ✓, `pnpm -C apps/web-manager test` ✓, `pnpm -C apps/web-manager build` ✓.

## 2026-04-10
- Change type: Web + Frontend
- Description: Simplified the manager portfolio and property-detail surfaces again to prioritize functional tables and unclipped actions. Replaced the remaining inline property-page popup menus with the shared action menu so overlays close on outside click and no longer get trapped by parent containers.
- Impact: Updated `apps/web-manager/src/components/property-management-panel.tsx` and `apps/web-manager/src/app/dashboard/properties/[id]/page.tsx` to use `ActionMenu`, switched the affected table wrappers to horizontal-scroll containers instead of clipped card shells, and flattened some summary/header sections to a more operational admin layout.
- Tests: `pnpm --filter web-manager lint` ✓, `pnpm --filter web-manager typecheck` ✓, `pnpm --filter web-manager test` ✓, `pnpm --filter web-manager build` ✓ after clearing stale `.next` output.

## 2026-04-10
- Change type: Web + Frontend
- Description: Added a shared centered loading animation for web-manager using the provided material-wave JSON, and replaced text-only `Chargement...` fallbacks on detail and panel surfaces without touching existing skeleton-based route loaders.
- Impact: Added `apps/web-manager/src/components/material-wave-loading.json` and `apps/web-manager/src/components/universal-loading-state.tsx`; updated property, unit, lease, maintenance, tenant, documents, messaging, and team-invite loading fallbacks to use the shared loader.
- Tests: `pnpm --filter web-manager lint` ✓, `pnpm --filter web-manager typecheck` ✓, `pnpm --filter web-manager test` ✓, `pnpm --filter web-manager build` ✓.

## 2026-04-10
- Change type: Web + Frontend
- Description: Continued the enterprise UI cleanup across detail and management surfaces in web-manager. Rebuilt the unit detail page into the quieter admin pattern, redesigned the contextual documents panel into a cleaner table-based surface, and standardized three-dot action menus across unit, tenant, lease, maintenance, and client portfolio actions.
- Impact: Added shared `apps/web-manager/src/components/action-menu.tsx`; updated `apps/web-manager/src/app/dashboard/units/[id]/page.tsx`, `apps/web-manager/src/components/contextual-document-panel.tsx`, `apps/web-manager/src/components/tenant-management-panel.tsx`, `apps/web-manager/src/components/maintenance-management-panel.tsx`, `apps/web-manager/src/components/lease-management-panel.tsx`, and `apps/web-manager/src/components/client-portfolio-table.tsx` to align destructive and secondary actions with the cleaner admin interaction model.
- Tests: `pnpm --filter web-manager lint` ✓, `pnpm --filter web-manager typecheck` ✓, `pnpm --filter web-manager test` ✓, `pnpm --filter web-manager build` ✓.

## 2026-04-10
- Change type: Web + API + DB + Workflow
- Description: Built a first real tasks and calendar workflow system for web-manager. Added persisted manual tasks and manual calendar events, automatic system-task generation for open maintenance, overdue payments, and leases nearing expiry, plus a data-backed dashboard Tasks workspace and Calendar workspace that merge custom events with derived lease, rent, maintenance, and task reminders.
- Impact: Added migration `0029_init_tasks_and_calendar_events.sql`; expanded shared domain, API-contracts, and data-access with tasks/calendar repositories and validation; added `/api/tasks`, `/api/tasks/[id]`, `/api/calendar-events`, and `/api/calendar-events/[id]`; replaced dashboard Tasks placeholder and seeded Calendar with real workflow UI.
- Tests: `pnpm -C apps/web-manager typecheck` ✓, `pnpm -C apps/web-manager build` ✓, `pnpm -C apps/web-manager test` ✓.

## 2026-04-10
- Change type: Web + Frontend
- Description: Redesigned the web-manager dashboard sidebar into a more enterprise operator shell. Replaced emoji navigation with a consistent inline icon set, added a French quick-context panel for current scope and role, introduced a user-controlled collapsed state, and scaffolded placeholder counters for operational modules.
- Impact: Updated the main dashboard shell styling in `apps/web-manager/src/app/dashboard/layout.tsx` and refreshed sidebar behavior/UI in `apps/web-manager/src/components/sidebar.tsx` to support the new navigation frame.
- Tests: `pnpm -C apps/web-manager lint` ✓, `pnpm -C apps/web-manager typecheck` ✓, `pnpm -C apps/web-manager test` ✓, `pnpm -C apps/web-manager build` ✓.

## 2026-04-10
- Change type: Web + Frontend
- Description: Reworked the Portfolio landing view in web-manager into a more enterprise-style workspace. Added a structured page header with KPI cards, cleaner tab navigation, search and filter controls for properties and units, and more disciplined portfolio/unit tables with clearer operational hierarchy.
- Impact: Updated `apps/web-manager/src/components/property-management-panel.tsx` to shift the portfolio page from a basic tab/table layout into a simpler administrative shell aligned with the new sidebar direction.
- Tests: `pnpm -C apps/web-manager lint` ✓, `pnpm -C apps/web-manager typecheck` ✓, `pnpm -C apps/web-manager test` ✓, `pnpm -C apps/web-manager build` ✓.

## 2026-04-09
- Change type: Web + API + DB + Reporting
- Description: Added optional unit-level applicability for expenses. Operators can now keep an expense at organization level, attach it to an entire property, or target a specific unit inside the selected property, with backend validation enforcing that the chosen unit belongs to the chosen scoped property.
- Impact: Added migration `0028_expenses_optional_unit.sql`; expanded expense domain/contracts/data-access shape with `unitId`; updated expense create/edit UI, route validation, scoped filtering, ledger display, CSV export, and printable finance report output.
- Tests: `pnpm lint` ✓, `pnpm test` ✓, `pnpm build` ✓.

## 2026-04-09
- Change type: Web + API + DB + Reporting
- Description: Extended the finance workspace with full expense maintenance and report exports. Expenses now support richer categories, vendor/payee metadata, edit/delete flows, and a new item route; reports now export CSV through an API route and expose a print-friendly PDF view without adding a PDF dependency.
- Impact: Added migration `0027_expand_expenses_metadata.sql`; expanded expense domain/contracts/data-access/app-service surfaces; added `/api/expenses/[id]`, `/api/reports/finance/export`, and `/reports/finance/print`; upgraded the expenses dashboard form and ledger actions.
- Tests: `pnpm lint` ✓, `pnpm test` ✓, `pnpm build` ✓.

## 2026-04-09
- Change type: Web + API + DB + Reporting
- Description: Completed the finance workspace by turning expenses into a real manual ledger instead of a placeholder. Added the `expenses` data model and API flow, wired the dashboard expenses page to list and create scoped expense records, and updated reports to subtract real expenses from paid-payment revenue for live net-income reporting.
- Impact: Added migration `0026_init_expenses.sql`, new shared expense domain/contracts/data-access surfaces, `/api/expenses`, a manual expense create form, and real expense-backed summaries on `/dashboard/expenses` and `/dashboard/reports`.
- Tests: `pnpm lint` ✓, `pnpm test` ✓, `pnpm build` ✓.

## 2026-04-09
- Change type: Web + Frontend + Reporting
- Description: Added three new finance routes in web-manager for revenues, expenses, and reports. Revenues and reports now compute real-time figures directly from paid lease payments with property/date filters and monthly breakdowns; the expenses page is introduced as the product shell with explicit zero-state because no expense ledger exists in the current data model.
- Impact: Added `/dashboard/revenues`, `/dashboard/expenses`, and `/dashboard/reports`; expanded finance navigation; introduced shared finance reporting helpers/components for filtered aggregation and monthly charts.
- Tests: `pnpm -C apps/web-manager typecheck` pending, `pnpm -C apps/web-manager lint` pending.

## 2026-04-09
- Change type: Web + API + DB + Email
- Description: Added editable organization details for managed-portfolio operators in web-manager. Organizations can now store optional logo/contact/signature metadata through a new dashboard organization settings page and `/api/organization`, the sidebar footer now links to that settings surface with organization identity instead of the raw email for manager/mixed operators, and tenant-facing invitations plus manager email/template rendering can use the stored organization details.
- Impact: Added migration `0025_organization_details.sql`; extended shared organization domain/data-access/contracts; added `/dashboard/organization`; updated sidebar footer behavior; expanded template placeholders and branded email wrapper behavior for tenant invitations and managed sends.
- Tests: `pnpm -C apps/web-manager test -- 'src/app/api/organization/route.test.ts' 'src/app/api/emails/send/route.test.ts' 'src/app/api/tenants/[id]/invite/route.test.ts'` ✓, `pnpm -C apps/web-manager typecheck` ✓, `pnpm -C apps/web-manager lint` ✓, `pnpm -C apps/web-manager build` ✓.

## 2026-04-09
- Change type: Web + API + Permissions
- Description: Tightened the team-invite product rule so invited team members are always treated as internal staff, not hybrid owner/managers. The team invite parser now forces `canOwnProperties` to false regardless of client input, and the team dashboard no longer exposes the ownership-capability checkbox or related copy in the invite flow.
- Impact: New team-member invitations cannot grant owner-style scope. Invited personnel now join strictly as workers with application-role access only.
- Tests: `pnpm -C apps/web-manager test -- 'src/app/api/organizations/members/route.test.ts'` pending, `pnpm -C apps/web-manager typecheck` pending.

## 2026-04-09
- Change type: Web + API + Permissions
- Description: Completed the second-phase team access rollout in web-manager. The team page now loads and displays application-level roles from team functions, allows authorized operators to update member access profiles from the dashboard, exposes a lightweight team activity feed from invitation/member history, and extends team-management authority so landlord, founding property manager, and property managers with `manage_team` permission can manage invitations. Landlord-only assignment of the `ADMIN` function is now enforced both in backend logic and in the UI.
- Impact: Team access is now visibly modeled as application roles instead of raw DB roles, and team invitation authority is no longer limited to the founding owner path once an admin has been delegated. Added route coverage for `/api/organizations/members/[id]/functions` and expanded invite authority tests.
- Tests: `pnpm -C apps/web-manager test -- 'src/app/api/organizations/members/route.test.ts' 'src/app/api/organizations/members/[id]/functions/route.test.ts' 'src/app/api/organizations/invitations/[id]/route.test.ts' 'src/app/api/auth/team-invitations/validate/route.test.ts' 'src/app/api/auth/team-invitations/accept/route.test.ts'` ✓, `pnpm -C apps/web-manager typecheck` ✓, `pnpm -C apps/web-manager lint` ✓, `pnpm -C apps/web-manager build` ✓.

## 2026-04-09
- Change type: Web + API + Onboarding
- Description: Reworked the manager team area into a first-phase account-owner and invitation workspace. Team invitation authority is now limited to the landlord or founding property manager, pending invites can be resent or revoked from the team page, and the public `/team-invite` flow now branches between new-account activation and existing-account login using the invited email instead of encouraging shared credentials.
- Impact: Team onboarding now matches the tenant-style email activation pattern more closely while keeping roles/permissions work deferred to phase 2. Added invitation action route at `/api/organizations/invitations/[id]` and extended invitation validation to expose whether the invited email already has an Hhousing account.
- Tests: `pnpm -C apps/web-manager test -- 'src/app/api/organizations/members/route.test.ts' 'src/app/api/auth/team-invitations/validate/route.test.ts' 'src/app/api/auth/team-invitations/accept/route.test.ts' 'src/app/api/organizations/invitations/[id]/route.test.ts'` pending.

## 2026-04-09
- Change type: Web + Infra + Payments
- Description: Removed the temporary recurring-payment test hooks from `/api/internal/payments/generate-recurring`. The endpoint now runs only in production shape: secret-protected GET, current UTC month only, all eligible orgs only.
- Impact: Monthly automatic charge generation stays active, but the ad hoc manual override path for arbitrary orgs/periods is gone after validation.
- Tests: `pnpm -C apps/web-manager test -- 'src/app/api/internal/payments/generate-recurring/route.test.ts'` ✓, `pnpm -C apps/web-manager typecheck` ✓.

## 2026-04-08
- Change type: Web + Mobile + Onboarding
- Description: Added a public tenant invite landing page at `/invite` on web-manager. The page now acts as the HTTPS entry for tenant activation links, tries to open the tenant app via `hhousing-tenant://accept-invite?token=...`, prioritizes the matching store CTA by device type, and falls back to App Store / Google Play download CTAs plus a manual reopen button. Also added associated-domain and Android app-link intent config in the Expo tenant app for `harakaproperty.com` and `www.harakaproperty.com`. Lease detail now exposes a `Renvoyer l'email d'activation` operator action that revokes the previous invite and sends a fresh activation email when the tenant still has no login.
- Impact: Tenant activation emails can now point to a real HTTPS page instead of a 404. Browser visitors get a device-aware download fallback, the mobile app is prepared to receive future verified app/universal links once domain association files are deployed with real signing metadata, operators can recover from missed activation emails without recreating the move-in, and the tenant app now falls back to `https://harakaproperty.com` when a local dev API host is unavailable.
- Tests: `pnpm -C apps/web-manager typecheck` ✓, `pnpm -C apps/web-manager test -- 'src/app/api/leases/[id]/route.test.ts'` ✓, `pnpm -C apps/mobile-tenant typecheck` pending.

## 2026-04-08
- Change type: Web + API + Infra + Payments
- Description: Added automatic recurring charge generation for web-manager through a secret-protected internal route at `/api/internal/payments/generate-recurring`, plus a monthly Vercel cron entry. Extended the payment repository with org discovery so the job can run across all orgs that currently have active leases. The same route also supports a temporary manual test override via `period` and optional `organizationId` so monthly billing can be exercised immediately without waiting for the next calendar month.
- Impact: Recurring rent/charge generation is no longer limited to the manual `POST /api/payments/generate` operator action. Production automation now depends on `CRON_SECRET` being configured in the deployed web-manager environment.
- Tests: `pnpm -C apps/web-manager test -- 'src/app/api/internal/payments/generate-recurring/route.test.ts'` ✓, `pnpm -C apps/web-manager typecheck` ✓.

## 2026-04-08
- Change type: Web + API + DB + Documents
- Description: Corrected the documents/email workflow so central uploads are no longer forced onto a property, unit, tenant, or lease at upload time. Added migration `0024_documents_optional_attachment.sql`, made document attachments nullable through domain/contracts/data-access, updated document listing UIs to treat unattached files as `Bibliothèque générale`, and changed pending lease draft email sending so operators explicitly choose one or more library documents before sending.
- Impact: The documents area now works as a real reusable library first, while lease draft sending matches the intended workflow of selecting documents later from inside the draft instead of relying on lease-bound attachments.
- Tests: `pnpm -C apps/web-manager test -- 'src/app/api/leases/[id]/route.test.ts'` ✓, `pnpm -C apps/web-manager typecheck` ✓, `pnpm -C apps/web-manager build` ✓.

## 2026-04-08
- Change type: Web + API + DB + Documents
- Description: Rebuilt `/dashboard/documents` into a three-tab workspace for document library, email templates, and outbound sends. Added org-scoped custom email templates plus built-in lease/welcome/rules templates, added generic Resend email sending with direct document attachments from uploaded files, and changed pending lease draft sending so `Envoyer l'email du brouillon` now sends the real lease email with attached lease documents from the documents library.
- Impact: Operators can upload and label lease/property/unit/tenant documents from one place, create and edit reusable custom templates, compose/send emails with attached stored documents, and send pending lease drafts with the uploaded lease files instead of a placeholder message.
- Tests: `pnpm -C apps/web-manager test -- 'src/app/api/email-templates/route.test.ts' 'src/app/api/email-templates/[id]/route.test.ts' 'src/app/api/emails/send/route.test.ts' 'src/app/api/leases/[id]/route.test.ts'` ✓, `pnpm -C apps/web-manager typecheck` ✓, `pnpm -C apps/web-manager build` ✓.

## 2026-04-08
- Change type: Web + API + Frontend
- Description: Changed the draft move-in email workflow so saving a lease draft no longer sends mail automatically. Pending lease detail now exposes an explicit `Envoyer l'email du brouillon` action, backed by a new `send_draft_email` path on `PATCH /api/leases/[id]`.
- Impact: Operators can save move-ins as quiet drafts, revisit the pending lease later, and manually trigger the tenant-facing draft email only when the draft is ready.
- Tests: `pnpm -C apps/web-manager test -- src/api/leases/lease.test.ts 'src/app/api/leases/[id]/route.test.ts'` ✓, `pnpm -C apps/web-manager typecheck` ✓, `pnpm -C apps/web-manager build` ✓.

## 2026-04-08
- Change type: Web + API
- Description: Hardened draft move-in lease creation so notification email issues no longer fail `POST /api/leases`. Draft lease creation now succeeds even when the selected tenant has no email yet or local Resend configuration/email delivery is unavailable.
- Impact: `/dashboard/leases/move-in` no longer returns a 500 during draft save just because the non-critical draft email side effect cannot run in local/dev or for incomplete tenant records.
- Tests: `pnpm -C apps/web-manager test -- src/api/leases/lease.test.ts` ✓, `pnpm -C apps/web-manager typecheck` ✓, `pnpm -C apps/web-manager build` pending.

## 2026-04-08
- Change type: Web + Frontend
- Description: Replaced the dashboard calendar-tab placeholder with a real month-view calendar surface in web-manager. The new view adds month navigation, a six-week grid, a right-rail agenda, and seeded operational events derived from live dashboard metrics so the workspace is visually and structurally ready for later wiring to real lease, maintenance, and payment deadlines.
- Impact: `/dashboard?tab=calendar` is now a usable planning surface instead of an empty state, while staying dependency-free and aligned with the existing French-first dashboard shell.
- Tests: `pnpm -C apps/web-manager typecheck` ✓, `pnpm -C apps/web-manager test` ✓, `pnpm -C apps/web-manager build` ✓.

## 2026-04-10
- Change type: Web + Frontend
- Description: Removed the unused screening-notes input from the manager listings screening workspace so application review only exposes status changes and tenant conversion.
- Impact: Updated `apps/web-manager/src/components/listing-management-panel.tsx` to drop the notes UI and stop sending note payloads from the client.
- Tests: `pnpm -C apps/web-manager typecheck` ✓.

## 2026-04-07
- Change type: Web + Frontend
- Description: Split the public marketplace out of the landing page into a dedicated public route at `/marketplace`. The landing page now shows only a compact preview of published homes plus a search form that redirects to the marketplace results page. Also replaced the simple landing-page `details` menus with richer hover/click dropdown panels and tightened the public marketing copy into French-first text.
- Impact: The homepage is now more clearly product-first, marketplace cards take less space, anonymous users can browse full listing search results on a separate public page, and navigation panels expose pricing / roles / features with more depth.
- Tests: `pnpm -C apps/web-manager typecheck` ✓, `pnpm -C apps/web-manager lint` ✓, `pnpm -C apps/web-manager test` ✓, `pnpm -C apps/web-manager build` ✓.

## 2026-04-07
- Change type: Web + Frontend
- Description: Redesigned the public homepage into a marketing-first landing page with a sticky header, dropdown navigation for pricing/use cases/features, auth CTAs, feature and pricing sections, FAQs, and a footer. The marketplace still lives on the same page but now sits lower with a more discreet search/filter bar and smaller listing cards.
- Impact: The root route now behaves like a true product landing page instead of a marketplace-first screen, while still exposing the public listings feed underneath the marketing content.
- Tests: `pnpm -C apps/web-manager typecheck` ✓, `pnpm -C apps/web-manager lint` ✓, `pnpm -C apps/web-manager test` ✓, `pnpm -C apps/web-manager build` ✓.

## 2026-04-07
- Change type: Web + Frontend
- Description: Made `/` the actual public landing page by removing the middleware redirect that forced anonymous visitors to `/login`. Added a reusable placeholder platform logo link on both auth pages so login and signup now provide a direct route back to the landing page.
- Impact: First-time visitors now land on the marketplace homepage instead of the login screen, while `/login` and `/signup` keep clear navigation back to the public entry point.
- Tests: pending.

## 2026-04-07
- Change type: Web + Frontend
- Description: Disabled the marketplace featured-listing promotion concept for now. Removed the `Highlight on marketplace home page` control from the listing editor, removed featured badges/sections from the marketplace UI, and now force listing saves to keep `isFeatured` false until paid promotion is implemented later.
- Impact: All published listings are treated equally in the current marketplace. The existing database field remains but is no longer active in the product flow.
- Tests: pending.

## 2026-04-07
- Change type: Web + Frontend
- Description: Replaced manual listing image URL entry with file-based uploads in the dedicated listing editor. Listing media now uses one uploaded cover image plus one-or-more uploaded gallery images, uploaded to Supabase Storage before saving the listing.
- Impact: Managers no longer paste media URLs by hand when publishing units. Listing saves now enforce required media at the client and contract layer.
- Tests: `pnpm -C apps/web-manager typecheck` ✓, `pnpm -C apps/web-manager lint` ✓, `pnpm -C apps/web-manager test` ✓, `pnpm -C apps/web-manager build` ✓.

## 2026-04-07
- Change type: Web + Frontend
- Description: Reworked the manager listings publish flow from an inline expander into a dedicated editor route at `/dashboard/listings/[unitId]`. The listings tab now stays compact and routes operators to a full-page listing editor instead of expanding cards in place. The editor removes the raw status dropdown and uses explicit actions for `Save as draft` and `Publish listing`, and renames the marketplace promotion toggle into clearer homepage-highlight wording.
- Impact: Publishing a unit is less cramped, the draft vs published intent is clearer, and the featured toggle now maps more directly to the marketplace homepage behavior.
- Tests: pending.

## 2026-04-07
- Change type: Web + API + DB + Marketplace
- Description: Added the public listings marketplace and the manager-side listings workspace on top of migration `0022_init_listings_and_applications.sql`. The web-manager home page now renders a public rental marketplace with search and filters for location, price, property type, and availability, highlights featured units, and links each published unit to a public detail page at `/listing/[id]` with share actions for WhatsApp, Facebook, and Instagram-style link copying. Added the manager workspace at `/dashboard/listings` with the requested three tabs: `Listings`, `Applications`, and `Screening`. Managers can publish or unpublish vacant units as listings, choose which fields are public, set marketing copy and media/contact overrides, review public applications, run manual screening, approve or reject, request more information, and convert approved applications into tenants.
- Impact: Property remains the internal source of truth while listing becomes a publish-state marketing layer over the same unit data. Applications are now stored as independent public intake records tied to listings, and approved applications can hand off directly into the existing lease move-in flow with tenant and unit context prefilled.
- Tests: `pnpm -C apps/web-manager typecheck` ✓, `pnpm -C apps/web-manager lint` ✓, `pnpm -C apps/web-manager build` ✓.

## 2026-04-07
- Change type: Web + API + DB + Auth
- Description: Reworked operator team onboarding into an invitation-first flow. Added migration `0021_team_member_invitations.sql` plus new shared domain/contracts/data-access support for pending operator invites. `POST /api/organizations/members` now invites by email instead of requiring an existing `userId`, sends a Resend-backed invite email, and no longer assigns team functions during invite. Added public validation/accept endpoints at `/api/auth/team-invitations/validate` and `/api/auth/team-invitations/accept`, plus a new `/team-invite` password-setup page that completes Supabase account creation/update and only then creates the organization membership. The team dashboard now shows active operator members without tenants and lists pending invitations separately.
- Impact: Team members no longer need to pre-exist in Supabase before being added. Membership creation is deferred until invite acceptance, tenants are removed from the operator team surface, and function assignment is decoupled from onboarding. New env support: `TEAM_MEMBER_INVITE_URL_BASE` for invite links.
- Tests: `pnpm lint` ✓, `pnpm typecheck` ✓, `pnpm test` ✓ (36 files / 102 tests), `pnpm -C apps/web-manager build` ✓.

## 2026-04-06
- Change type: Web + API + Frontend
- Description: Moved tenant invitation delivery from lease finalization to draft move-in creation. Lease creation now creates the invitation immediately and can send the activation email through a new Resend-backed mail adapter (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`) using the tenant email captured in the move-in flow. Finalization now only activates the lease after signature metadata and paid initial charges are in place. Also redesigned the payments workspace to group records by tenant first, with one table row per tenant and a chronological charge ledger shown for the selected tenant.
- Impact: Tenants can receive their access email as soon as the draft move-in is created, matching the move-in form expectation. Managers now review payments as tenant dossiers instead of one flat row per charge, which keeps recurring and one-time charges readable over time.
- Tests: `pnpm lint` ✓, `pnpm typecheck` ✓, `pnpm test` ✓ (34 files / 101 tests), `pnpm -C apps/web-manager build` ✓.

## 2026-04-06
- Change type: Web + API + DB
- Description: Upgraded manual payment generation from rent-only to recurring-charge generation. Added migration `0020_recurring_charge_generation_alignment.sql` to align `lease_charge_templates.charge_type` with the current domain model and to key generated payment uniqueness by `lease_id + charge_period + source_lease_charge_template_id`. The Postgres payment repository now generates scheduled base rent rows from each active lease billing schedule and additional recurring payment rows from `lease_charge_templates` for monthly, quarterly, and annual recurring charges. Added route tests for `POST /api/payments/generate` and updated payments UI copy to reflect recurring charge generation instead of rent-only generation.
- Impact: Operators can manually generate the full recurring billing set for a period, including rent plus recurring fees configured on the lease, without creating duplicates for the same lease/template/period.
- Tests: `pnpm lint` ✓, `pnpm typecheck` ✓, `pnpm test` ✓ (34 files / 101 tests), `pnpm -C apps/web-manager build` ✓.

## 2026-04-06
- Change type: Web + Frontend
- Description: Refined the lease detail document workflow to make signed lease collection explicit during move-in finalization. The contextual document panel now supports lease-specific copy, preferred document highlighting, and default upload type configuration. Lease detail uses that to default uploads to `Contrat de bail` and show whether a signed lease file has already been attached.
- Impact: Operators now get a clearer manual-signature workflow on pending leases without changing the existing document backend or generic document panel behavior elsewhere.
- Tests: `pnpm lint` ✓, `pnpm typecheck` ✓, `pnpm test` ✓ (33 files / 98 tests), `pnpm -C apps/web-manager build` ✓.

## 2026-04-06
- Change type: Web + API + DB
- Description: Refactored the lease move-in flow into a draft-first workflow. New move-ins now save leases as `pending`, prefill rent/currency/email from the selected unit and tenant in the move-in form, and generate initial payment rows in `payments` for deposits, one-time fees, prorated rent, or first-month rent. Lease detail now exposes a finalize surface that captures signature metadata and only activates the lease once all initial charges are paid. Tenant invitation creation was removed from the renters list and moved into lease finalization.
- Impact: Unit occupancy now waits for lease activation instead of draft creation, operators can manage move-in onboarding from the lease detail page, and initial billing is tracked in the existing payments backbone instead of a parallel invoice model.
- Tests: `pnpm lint` ✓, `pnpm typecheck` ✓, `pnpm test` ✓ (33 files / 98 tests), `pnpm -C apps/web-manager build` ✓.

## 2026-04-06
- Change type: Web + Infra
- Description: Hardened detail pages against a Next.js dev/runtime vendor-chunk resolution failure involving Supabase browser dependencies from `ContextualDocumentPanel`. Switched the contextual document panel import on property, unit, lease, and tenant detail pages to `next/dynamic` with `ssr: false`, so the browser-only document/upload panel is no longer pulled into the server worker bundle.
- Impact: Detail pages such as `/dashboard/tenants/[id]` no longer depend on the missing `@supabase/auth-js` server vendor chunk during dev rendering.
- Tests: `pnpm lint` ✓, `pnpm typecheck` ✓, `pnpm test` ✓ (33 files / 96 tests), `pnpm -C apps/web-manager build` ✓.

## 2026-04-06
- Change type: Web + Frontend
- Description: Expanded `/dashboard/tenants` with a second display mode in cards alongside the existing table view. Tenant rows/cards now show a lease-status badge (`Avec bail` / `Sans bail`) based on whether the tenant currently has an `active` or `pending` lease, and the page now includes filters to show all tenants, only those with a lease, or only those without one.
- Impact: Operators can switch between dense table review and card browsing, and can quickly isolate unassigned renters who still need a move-in or lease setup.
- Tests: `pnpm lint` ✓, `pnpm typecheck` ✓, `pnpm test` ✓ (33 files / 96 tests), `pnpm -C apps/web-manager build` ✓.

## 2026-04-06
- Change type: Web + API + Frontend
- Description: Changed the renters page and `GET /api/tenants` to return all tenants created in the current organization, instead of filtering the list down to tenants attached to leases within the active owned/managed portfolio scope. Added a route test to lock that behavior.
- Impact: Newly created tenants now appear immediately on `/dashboard/tenants`, even before they have been moved into a unit or linked to a lease.
- Tests: `pnpm lint` ✓, `pnpm typecheck` ✓, `pnpm test` ✓ (33 files / 96 tests), `pnpm -C apps/web-manager build` ✓.

## 2026-04-06
- Change type: Web + API + Frontend
- Description: Fixed the tenant creation follow-up flow where `/dashboard/tenants/[id]` could show `Locataire introuvable` immediately after creating an unassigned tenant. The tenant detail API now allows org tenants that do not yet belong to any lease in the current scoped portfolio, while still rejecting tenants attached to out-of-scope leases. Also cleaned up the add-tenant form with explicit field labels and removed the manual photo URL input, keeping photo upload file-only.
- Impact: Newly created tenants can be opened and edited immediately after creation, and the add-tenant form is clearer and less error-prone.
- Tests: `pnpm lint` ✓, `pnpm typecheck` ✓, `pnpm test` ✓ (32 files / 95 tests), `pnpm -C apps/web-manager build` ✓.

## 2026-04-06
- Change type: Web + Frontend
- Description: Split `/dashboard` into three top-level tabs on the page itself: `Overview`, `Tasks`, and `Calendar`. The dashboard route now reads a `tab` search param server-side, keeps the existing metrics/cards on `Overview`, and renders empty placeholder states for `Tasks` and `Calendar` until those workspaces are implemented.
- Impact: Operators can navigate the dashboard as a multi-surface workspace without changing the existing overview metrics behavior.
- Tests: `pnpm lint` ✓, `pnpm typecheck` ✓, `pnpm test` ✓ (32 files / 94 tests), `pnpm -C apps/web-manager build` ✓.

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