# Owner and Admin

## Property Owner Portal (Read-Only)

**Goal:** "Understand performance, not operate"

Implemented as `/owner-portal` inside `web-manager` (not a separate app). First slice: dashboard, properties, payments, reports (+ CSV).

### Feature Set

**Dashboard:**
- Total properties owned
- Monthly income summary
- Occupancy snapshot

**Property View:**
- List of owned properties
- Per-property performance: occupancy, revenue, tenant count

**Financials:**
- Monthly income breakdown
- Annual summaries
- Download statements

**Owner Cannot:**
- Edit properties
- Manage tenants
- Handle maintenance
- Access messaging system

## Platform Admin (Internal SaaS ops)

**Goal:** "Control the SaaS system"

**Not a separate Next app.** Lives in `web-manager` at `/admin`, gated by the global `platform_admins` table and role `platform_admin`.

### MVP (shipped)

- Admin shell (overview, users, organizations, audit)
- Cross-org users list/detail + suspend/activate (`platform_user_statuses`)
- Cross-org organizations list/detail + suspend/activate (`organizations.status`)
- Platform audit log (`platform_audit_logs`)
- **First admin (seed):** `node apps/web-manager/scripts/seed-platform-admin.mjs admin@example.com 'YourPassword123!'`
- **Grant existing user:** `node apps/web-manager/scripts/grant-platform-admin.mjs <email>`

### Slice 2 (shipped)

- Org health counters on organization detail (members, units, leases, overdue payments, open maintenance)
- Audit polish — French labels + filters; logs suspend/activate and platform-admin grant/revoke
- Grant/revoke platform admin from user detail UI
- Operator/public support via **Tawk.to** chat (root layout widget; hidden on `/admin`)
- Product analytics stay in PostHog (not mirrored in the admin feed)

### Slice 3 — SaaS billing (shipped)

- Usage-based subscription: free under 2 properties; then `$price × unit_count` / month (default $5/logement)
- Platform admin: billing settings, Mobile Money payment methods, invoice generate/confirm/void (`/admin/billing`)
- Operator Facturation page (`/dashboard/billing`) — estimate, pay instructions, signal payment
- Soft overdue banner (no hard lock); platform admin confirms paid (no live PawaPay yet)
- Monthly cron: `/api/internal/billing/generate-saas-invoices`

### Support model

- **Not** an in-app ticket system. Operators chat via Tawk.to; Hhousing ops answer in the Tawk dashboard.
- Domain-specific intake later (e.g. property `reports`, `contact_requests`) — lightweight, not a full ticket product.

### Deferred

- Live PawaPay settlement for SaaS invoices
- Hard lock / auto-suspend for unpaid SaaS invoices
- Feature flags
- Regional DRC config beyond existing product rules
- Lightweight domain intake (`reports` / `contact_requests`)

### Screen Flow

**Admin dashboard (`/admin`):**
- Total users, orgs, suspended counts
- Recent platform audit

**User management:**
- Users list / detail
- Suspend/activate account

**Organization management:**
- Organizations list / detail
- Suspend/activate organization

**Platform audit:**
- Admin action history

**SaaS billing (`/admin/billing`):**
- Pricing settings + Mobile Money payment methods
- Subscription invoices (generate, confirm paid, void)
