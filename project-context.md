# Project Context - Hhousing

## Product Direction

Hhousing is now defined as a full property operations SaaS (TenantCloud-style), not a listing-centric app.

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

The product has 4 sides:

1. **Tenant side (mobile app only)**
   - End-user renting a unit.
   - Sees lease, pays rent, submits maintenance, chats with manager, views documents.
   - Role: `tenant` (cannot access web-manager operator system).

2. **Landlord / Property Manager side (web app)**
   - Operates properties, units, tenants, rent, maintenance, communication, and documents.
   - Roles: `landlord` or `property_manager` (with optional `canOwnProperties` capability).
   - This is the only web interface for these operators.

3. **Property Owner (Investor) side**
   - Deferred to future phase.
   - Read-only business view: income, occupancy, statements, performance.
   - Will be a separate light portal or integrated read-only views in web-manager.

4. **Platform Admin side (internal SaaS ops)**
   - Deferred to future phase.
   - Controls organizations, subscriptions, disputes, support, feature flags, and audit visibility.
   - Reserved role: `platform_admin` (not assigned during operator signup).

## Core Data Backbone

All modules must map back to these entities:

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

## Roles and Permission Model

### Core Roles

All users have exactly one role per organization. Roles are stored in the database (organization_memberships table).

| Role | Where | Access | Notes |
|---|---|---|---|
| **tenant** | Mobile app only | Own lease, payments, requests, messages, documents | Created automatically when user is linked to a lease. NEVER granted access to web-manager. |
| **property_manager** | web-manager (operator system) | Full CRUD: properties, units, tenants, leases, payments, maintenance, messages, documents within own organization | Primary operator role. Can own properties if `canOwnProperties` capability is true. |
| **landlord** | web-manager (operator system) | Full CRUD: properties, units, tenants, leases, payments, maintenance, messages, documents within own organization | Property owner who may self-manage or hire manager. Functionally identical to property_manager. |
| **platform_admin** | Internal/reserved | Cross-organization SaaS ops | Deferred to future phase. Not assigned during operator onboarding. |

### Role Assignment Flow

Operators (property_manager, landlord) are assigned roles during account creation via an account type picker:

1. User not logged in → landing page
2. User clicks "Sign up" → signup form (email, password, name)
3. Post-signup → account type picker:
   - **"I manage my own rental(s)"** → onboarding UX: owner-operator
   - **"I manage rentals for others"** → onboarding UX: pure property manager
   - **"I manage a mix of both"** → onboarding UX: hybrid operator
   - **"I don't manage any rentals yet"** → onboarding UX: starter path
4. Redirect after account creation:
   - show onboarding flow variant (transient UX, not persisted)
   - enter dashboard with variant-specific initial language/cards
5. Security model remains role/capability based only:
   - role and capabilities are persisted in DB
   - picker choice itself is not persisted

### Membership Model

Each user-organization link is a membership record:

```sql
organization_memberships (
  id text primary key,
  user_id text not null references auth.users(id),
  organization_id text not null references organizations(id),
  role text not null check (role in ('tenant', 'property_manager', 'landlord')),
  can_own_properties boolean not null default false,  -- capability flag for hybrid operators
  status text not null default 'active' check (status in ('invited', 'active', 'inactive')),
  invited_by text references auth.users(id),  -- who invited this user
  created_at timestamptz not null default now()
)
```

### Authorization Rules

- **Source of truth:** organization_memberships table. No Supabase metadata.
- **Unauthenticated users:** Redirected to landing → login.
- **Authenticated users with no membership:** Redirected to account type picker or onboarding.
- **Authenticated users in a membership:** Role and capabilities enforced on every request.
- **Tenant role in web-manager:** Always rejected with 403. Tenants use mobile app only.
- **property_manager / landlord:** Can perform write operations on their organization's data.
- **Cross-org requests:** Show org switcher or redirect to primary org.
- **All authorization checks:** Enforced server-side (middleware, server actions, API routes). Never trust client.

### UX Personalization Rules (No Persistence)

- Account type picker is **presentation-only** and **onboarding-only**.
- `account_type` is **not** stored in `organization_memberships` or any security table.
- Security decisions come only from persisted role + capabilities.
- Picker choice may drive transient onboarding and first-dashboard variants (query params/client state), then UI falls back to neutral wording.

Role assignment is server-enforced. All authorization checks live in server code.

## Feature Set

### Tenant App (Mobile)

Core:
- Login and profile
- Lease details (agreement, move-in date, duration, contact)
- Rent due summary (amount, due date, status)
- Pay rent (card / mobile money / bank)
- Payment history and receipts
- Maintenance requests with photos and status tracking
- Messaging with landlord/manager
- Notifications (rent due, updates, messages)
- Documents (lease, receipts, notices)

Nice-to-have:
- Split rent reminders
- Community notices feed

### Landlord / Property Manager (Web)

Dashboard:
- Portfolio overview
- Occupied vs vacant units
- Monthly income summary
- Pending/overdue rent
- Active maintenance requests

Operations:
- Create/manage properties
- Add/manage units
- Assign tenants to units
- Track occupancy
- View tenant profiles and activity

Financial:
- Rent collection tracking
- Payment status dashboard
- Overdue tracking
- Late fee automation (optional)
- Export reports (CSV/PDF)

Maintenance:
- View requests
- Assign contractor/staff
- Update status (open -> in_progress -> done)
- Track resolution time

Communication and documents:
- Message tenants
- Broadcast announcements
- Upload/store leases, notices, receipts

Analytics:
- Occupancy rate
- Monthly income
- Payment completion rate
- Maintenance frequency

### Property Owner Portal (Read-only)

- Total properties owned
- Monthly/annual income summaries
- Occupancy snapshot
- Property-level performance views
- Statements and report export

### Platform Admin (Internal)

- Manage organizations/accounts
- Suspend/activate accounts
- Handle disputes and support tickets
- View global transactions/audit logs
- Manage SaaS plans/billing
- Feature flags by region
- Usage limits by plan

## UI Screen Flows

### 1) Tenant Mobile App

Auth:
- Splash
- Login
- Sign up
- Forgot password
- Verify email/SMS (optional)

Home dashboard:
- Rent due card (amount, due date, status)
- Quick actions: pay rent, report issue, message manager
- Notifications preview

Lease:
- Current unit info
- Lease start/end dates
- Monthly rent breakdown
- Deposit info (if applicable)
- Contact landlord/manager action

Payments:
- Pay rent primary action
- Payment method selection
- Payment confirmation
- Payment history (month-by-month)
- Receipt detail

Maintenance:
- Create request action
- Request form: title, description, image upload
- Past requests list
- Request detail: status timeline, updates/messages

Messages:
- Conversation list
- Tenant <-> manager chat
- Optional attachments (images/files)

Documents:
- Lease agreement viewer
- Receipts list
- Download document view

Profile:
- Personal details
- Unit info
- Logout
- Settings (notifications, language)

### 2) Landlord / Property Manager Web App

Auth:
- Login
- Forgot password

Shell layout:
- Sidebar navigation
- Top bar (search, notifications, profile)

Dashboard:
- Occupancy overview cards
- Monthly income chart
- Overdue rent list
- Active maintenance requests

Properties:
- Properties list
- Create property
- Property detail: units overview, occupancy, income summary

Property detail:
- Header (name, address)
- Units list
- Income breakdown
- Maintenance summary

Units:
- Units list
- Add unit modal
- Unit detail: status, rent, assigned tenant, lease history

Tenants:
- Tenant list
- Add tenant
- Tenant profile: personal info, current lease, payment history, maintenance history

Leases:
- Active leases list
- Create lease (assign tenant + unit, rent amount, dates)
- Lease detail

Payments:
- Payments table
- Filters: paid/unpaid/late
- Mark payment as received
- Payment detail

Maintenance:
- Request list
- Request detail: description, images, status control
- Assign task screen

Messaging:
- Conversation list
- Chat view
- Broadcast composer

Documents:
- Upload document
- Attach to tenant/unit/property
- Document library

Analytics:
- Occupancy chart
- Income trends
- Payment completion rate
- Maintenance frequency

### 3) Property Owner Portal (Simplified)

Dashboard:
- Total properties
- Monthly income summary
- Occupancy rate

Property view:
- Owned properties list
- Property detail: income, occupancy, tenant summary

Financials:
- Monthly income breakdown
- Annual summary
- Export report

### 4) Platform Admin (Internal)

Admin dashboard:
- Total users (tenants, landlords, owners)
- Active organizations
- System activity overview

User management:
- Users list
- User detail
- Suspend/activate account

Organization management:
- Organizations list
- Organization detail: properties, users, activity

Support/tickets:
- Ticket list
- Ticket detail
- Status updates (open -> resolved)

Platform settings:
- Plans and subscriptions
- Feature toggles
- System configuration

## Core Workflows

### 1) Renting Flow

Tenant is assigned a unit -> receives rent schedule/invoice -> pays -> system updates lease/payment state -> landlord dashboard updates -> owner income view updates.

### 2) Maintenance Flow

Tenant creates request -> landlord/manager receives -> assigns contractor -> status updates -> tenant notified until resolved.

### 3) Onboarding Flow

Landlord creates organization account -> adds property -> creates units -> invites tenants -> tenant joins and sees lease/rent immediately.

## Domain Glossary

| Term | Definition |
|---|---|
| Organization | Landlord company/account boundary for data and permissions |
| Property | Building/house under management |
| Unit | Rentable sub-entity in a property (apartment/house/room) |
| Lease | Contract linking tenant to a specific unit over time |
| Tenant | Renter assigned to one or more leases |
| Payment | Monetary transaction for lease charges |
| Maintenance Request | Tenant-reported issue with lifecycle state |
| Conversation | Message thread between tenant and management |
| Document | Lease files, receipts, notices, IDs, contracts |

## Product Priorities and Non-Goals

Priority now:
- Property operations (properties/units/leases/tenants)
- Rent and payments
- Maintenance lifecycle
- Messaging and documents
- Admin SaaS controls

Not a current priority:
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
| Role source | organization_memberships table (DB is source of truth, not Supabase metadata) |
| Validation | Zod at API boundaries |
| API shape | `{ success: true; data: T }` or `{ success: false; error: string; code: string }` |
| Authorization | Server-side checks only; enforced via session resolution and capability guards |
| Shared logic | Keep in shared packages, no duplication |
| Multi-org access | Explicit org header/body on API calls (cookies omitted); org cookie for server pages |
| One role per org | Yes; users need invite/re-signup to join second org |
| Invite flow | Phase 2 (stubs only for now) |

## Brand and Localization Standards

### Brand Colors

Primary palette:
- `#FFFFFF` - Blanc Parfait
- `#0063FE` - Bleu Vif
- `#010A19` - Bleu Nuit Tres Sombre

Usage intent:
- `#0063FE` is the primary action color (CTA, active states, key highlights).
- `#010A19` is the primary dark surface/text anchor.
- `#FFFFFF` is the base surface/background and inverse text where needed.

### Typography

Brand font family:
- GALANO GROTESQUE

Weights and usage:
- Semi Bold: logo wordmark and strong headings.
- Regular: body copy and standard UI text.

Design direction:
- Use a contemporary, strong sans-serif tone aligned with brand identity.

### Localization and Market

- Primary market: Republique Democratique du Congo.
- Primary product language: French.
- Product copy, labels, and workflows should be written French-first by default.
- Support local formatting for date, currency, and number display in DRC context.
