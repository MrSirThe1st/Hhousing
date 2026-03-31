# Roles and Auth

## Core Roles

All users have exactly one role per organization. Roles are stored in the database (`organization_memberships` table).

| Role | Where | Access | Notes |
|---|---|---|---|
| **tenant** | Mobile app only | Own lease, payments, requests, messages, documents | Created automatically when user is linked to a lease. NEVER granted access to web-manager. |
| **property_manager** | web-manager (operator system) | Full CRUD: properties, units, tenants, leases, payments, maintenance, messages, documents within own organization | Primary operator role. Can own properties if `canOwnProperties` capability is true. |
| **landlord** | web-manager (operator system) | Full CRUD: properties, units, tenants, leases, payments, maintenance, messages, documents within own organization | Property owner who may self-manage or hire manager. Functionally identical to property_manager. |
| **platform_admin** | Internal/reserved | Cross-organization SaaS ops | Deferred to future phase. Not assigned during operator onboarding. |

## Role Assignment Flow

Operators (`property_manager`, `landlord`) are assigned roles during account creation via an account type picker:

1. User not logged in -> landing page
2. User clicks "Sign up" -> signup form (email, password, name)
3. Post-signup -> account type picker:
   - "I manage my own rental(s)" -> onboarding UX: owner-operator
   - "I manage rentals for others" -> onboarding UX: pure property manager
   - "I manage a mix of both" -> onboarding UX: hybrid operator
   - "I don't manage any rentals yet" -> onboarding UX: starter path
4. Redirect after account creation:
   - show onboarding flow variant (transient UX, not persisted)
   - enter dashboard with variant-specific initial language/cards
5. Security model remains role/capability based only:
   - role and capabilities are persisted in DB
   - picker choice itself is not persisted

## Membership Model

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

## Authorization Rules

- **Source of truth:** `organization_memberships` table. No Supabase metadata.
- **Unauthenticated users:** Redirected to landing -> login.
- **Authenticated users with no membership:** Redirected to account type picker or onboarding.
- **Authenticated users in a membership:** Role and capabilities enforced on every request.
- **Tenant role in web-manager:** Always rejected with 403. Tenants use mobile app only.
- **property_manager / landlord:** Can perform write operations on their organization's data.
- **Cross-org requests:** Show org switcher or redirect to primary org.
- **All authorization checks:** Enforced server-side (middleware, server actions, API routes). Never trust client.

## UX Personalization Rules (No Persistence)

- Account type picker is **presentation-only** and **onboarding-only**.
- `account_type` is **not** stored in `organization_memberships` or any security table.
- Security decisions come only from persisted role + capabilities.
- Picker choice may drive transient onboarding and first-dashboard variants (query params/client state), then UI falls back to neutral wording.

Role assignment is server-enforced. All authorization checks live in server code.

## Account Type Capabilities

All three operator account types (`self_managed_owner`, `manager_for_others`, `mixed_operator`) use the same web-manager platform but with different capabilities and UI composition. They are not separate systems.

### self_managed_owner (Simple Owner-Operator)

**Meaning:**
- Owns properties
- Manages only their own units
- Small landlord business

**Available Features:**
- Dashboard: occupancy overview, monthly income, overdue rent, maintenance (own portfolio only)
- Properties: create/edit properties, create/edit units, assign tenants
- Tenants: view profiles, lease/payment history, basic contact (own properties only)
- Leases: create, edit, terminate leases
- Payments: record payments, track rent status, export simple reports
- Maintenance: view requests, assign/resolve, update status
- Messaging: message tenants, broadcast announcements (own properties only)
- Documents: upload leases, store property documents
- Team: invite 1-few users (assistant, co-manager) with simple roles (viewer/helper/manager-lite)

**Not Available:**
- Multi-owner/client management
- Portfolio separation or grouping
- Context switching between owners
- Client dashboards
- Revenue breakdown per client
- Advanced analytics (cross-property benchmarking)
- Advanced staff role delegation

**Experience Changes:**
- Simpler dashboard
- No team features (basic only)
- No multi-owner switching
- Basic financial tracking

### manager_for_others (Professional Property Manager)

**Meaning:**
- Manages properties for clients
- Property management company
- Operates at scale

**Available Features:**
- Portfolio structure: multiple property owners, client-based grouping, portfolio segmentation
- Dashboard: all properties across clients, filters by owner/client, portfolio-wide analytics
- Properties: create/manage for clients, assign ownership to client profiles, multi-property tools
- Clients/Owners: create/manage client profiles, link properties to clients, view client-specific dashboards
- Units: manage units across multiple owners, cross-property tracking
- Tenants: full management across portfolio, assignment across different clients
- Leases: create/track across all client properties, lease tracking per owner
- Payments: portfolio-wide tracking, client-level financial separation, advanced reporting per owner
- Maintenance: cross-property dashboard, assign per client/property
- Messaging: tenant messaging across portfolio, client-specific communication logs
- Analytics: per-client revenue reports, portfolio performance comparison, occupancy by client, maintenance cost distribution
- Team: invite full team members, assign internal roles (agent, accountant, maintenance staff), manage permissions per staff, scale teams per client/property

**Not Available:**
- Simple single-owner view mode
- Pure personal dashboard mode (always portfolio-based)
- Mobile-first tenant experience control
- Investor read-only mode (future owner portal)

**Experience Changes:**
- Multi-owner dashboard
- Tenant management at scale
- Maintenance workflows
- Reporting per owner

### mixed_operator (Hybrid Owner + Manager)

**Meaning:**
- Both owner and manager roles
- Hybrid business owner + manager
- Context switching between personal and client properties

**Available Features:**
- Dual context system: switch between "My properties" and "Clients/Managed properties"
- Property scope: own properties + client properties, combined or separated views
- Dashboard: toggle between personal dashboard (`self_managed_owner` mode) and portfolio dashboard (`manager_for_others` mode)
- Properties: create own properties, manage client properties, switch ownership context per property
- Clients: can manage clients or ignore client system when focusing personal
- Leases: works in both contexts, creation depends on selected context
- Payments: split view (personal income vs managed income), combined reporting option
- Maintenance: unified inbox or context-filtered inbox
- Analytics: two modes (personal performance vs managed portfolio performance)
- Team: same as `manager_for_others`, team access applies to both contexts (personal properties team + client management team)

**Not Available:**
- No new features beyond the other two roles
- No additional permissions
- No admin-level controls
- No tenant/mobile features
- No separate org system

**Experience Changes:**
- Hybrid dashboard
- Ability to switch context: "my properties" vs "client properties"
- Combined analytics

**Important:** This role does not add features; it adds context switching capability.