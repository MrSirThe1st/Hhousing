# Project Context - Hhousing

## Product Direction

Hhousing is a full property operations SaaS (TenantCloud-style), not a listing-centric app.

## Product Inspiration

Primary inspiration: TenantCloud.

Use inspiration for:
- End-to-end rental operations flow (tenant, manager, owner, admin)
- Operational clarity (leases, rent lifecycle, maintenance lifecycle)
- Practical dashboards and workflow-first UX

Do not copy directly:
- Brand assets, visual identity, or proprietary copy
- Exact UX text or screen structure as a clone

Hhousing should adapt the model for DRC realities (French-first UX, local payment behavior, local operations constraints).

## Product Sides

1. **Tenant side (mobile app only)**
   - End-user renting a unit
   - Sees lease, pays rent, submits maintenance, chats with manager, views documents
   - Role: `tenant` (cannot access web-manager)

2. **Landlord / Property Manager side (web app)**
   - Operates properties, units, tenants, rent, maintenance, communication, and documents
   - Roles: `landlord` or `property_manager` (with optional `canOwnProperties`)
   - This is the primary operator interface

3. **Property Owner (Investor) side**
   - Deferred
   - Read-only performance view (income, occupancy, statements)

4. **Platform Admin side (internal SaaS ops)**
   - Deferred
   - Cross-organization control (subscriptions, support, disputes, feature flags, audit)

## Core Data Backbone

All modules must map to these entities:
- Organization
- Property
- Unit
- Lease (tenant <-> unit)
- Tenant
- Payment
- Maintenance Request
- Message / Conversation
- Document

If a feature does not strengthen one of these entities or their workflows, it is not a priority.

## Core Workflows

1. Renting flow:
   - Tenant assigned to unit -> invoice/schedule -> payment -> lease/payment state update -> landlord dashboard update -> owner income update

2. Maintenance flow:
   - Tenant creates request -> landlord/manager receives -> assigns contractor -> status updates -> tenant notified until resolved

3. Onboarding flow:
   - Landlord creates organization -> adds property -> creates units -> invites tenants -> tenant joins and sees lease/rent

## Product Priorities and Non-Goals

Priority now:
- Property operations (properties/units/leases/tenants)
- Rent and payments
- Maintenance lifecycle
- Messaging and documents
- Admin SaaS controls

Not current priority:
- Marketplace-style listing growth work
- Cosmetic listing enhancements disconnected from operations
- AI recommendations
- Mortgage tooling

## Fixed Technical Decisions

| Concern | Decision |
|---|---|
| Web | Next.js App Router (operators only; tenants use mobile app) |
| Mobile | Expo (tenants exclusively) |
| Language | TypeScript strict, no `any` |
| Auth | Supabase Auth (login/signup provider) |
| Data | PostgreSQL relational backbone |
| Role source | `organization_memberships` table (DB source of truth, not Supabase metadata) |
| Validation | Zod at API boundaries |
| API shape | `{ success: true; data: T }` or `{ success: false; error: string; code: string }` |
| Authorization | Server-side checks only; enforced via session resolution and capability guards |
| Shared logic | Keep in shared packages, no duplication |
| Multi-org access | Explicit org header/body on API calls; org cookie for server pages |
| One role per org | Yes; users need invite/re-signup to join second org |
| Invite flow | Phase 2 (stubs only for now) |

## Domain Glossary

| Term | Definition |
|---|---|
| Organization | Account/data boundary for permissions |
| Property | Building/house under management |
| Unit | Rentable sub-entity in a property |
| Lease | Contract linking tenant to a unit over time |
| Tenant | Renter assigned to lease(s) |
| Payment | Monetary transaction for lease charges |
| Maintenance Request | Tenant-reported issue with lifecycle state |
| Conversation | Message thread between tenant and management |
| Document | Lease files, receipts, notices, IDs, contracts |

## Detailed Context Modules (Load On Demand)

Use these focused docs only when the task needs them:
- `docs/context/roles-and-auth.md` — membership model, auth rules, role capabilities
- `docs/context/features-tenant.md` — tenant mobile features and screens
- `docs/context/features-manager.md` — manager web features and screens
- `docs/context/finance-controls.md` — finance invariants, ledger/source-of-truth rules, reconciliation controls
- `docs/context/features-owner-admin.md` — deferred owner/admin portals
- `docs/context/brand.md` — colors, typography, localization
