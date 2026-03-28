# Project Context — Hhousing

## Product Purpose

Hhousing is a real estate marketplace and property management platform built for the Congolese market. It combines:

- **Discovery marketplace** — browse, search, and filter property listings for sale or rent (similar to Zillow)
- **Property management system** — managers operate properties, assign tenants, and track maintenance
- **Tenant interaction layer** — tenants view their assigned property, submit maintenance requests, and follow up on resolution

The platform is designed to be simple and reliable, accessible from web and mobile, serving both public-facing consumers and operational stakeholders.

---

## User Types and Permissions

| Role | Key Capabilities |
|---|---|
| **General User** (buyer/renter/seller) | Browse listings, search/filter, view property details, contact via WhatsApp/call, save listings, post own listings |
| **Manager** | Create/edit/delete listings, manage portfolio of properties, assign tenants, view and resolve maintenance requests |
| **Owner** | View owned properties, assign a manager, see basic activity (views, contacts, tenant status) |
| **Tenant** | View assigned property, submit maintenance requests with description/photos, track request status, contact manager via WhatsApp |
| **Admin** | Full user management (view, suspend, delete), listing moderation (approve/remove), view all maintenance requests, platform oversight |

Role assignment is server-enforced. All protected operations are authorized in server code, never client-side.

---

## Main Workflows

### 1. Property Discovery
- User opens feed → browses listings
- Filters by rent/sale, location, price, rooms
- Views property detail page (images, description, price, location)
- Contacts seller/manager via click-to-call or click-to-WhatsApp

### 2. Property Listing
- Authenticated user or manager creates a listing (price, type, rooms, description, location pin, images)
- Manager or admin can edit or remove listing
- Admin can approve/reject listings before they go live (should-have)

### 3. Property Management
- Manager creates and manages multiple properties
- Owner assigns manager to a property
- Each property has explicit owner, optional manager, optional tenant

### 4. Tenant Interaction
- Manager assigns tenant to property
- Tenant submits maintenance request (title, description, optional photos)
- Manager views requests, updates status: `pending` → `in_progress` → `completed`
- Tenant tracks status changes

### 5. Admin Operations
- Admin views all users, properties, maintenance requests
- Admin suspends/deletes users or removes listings
- Admin monitors platform health

---

## Domain Glossary

| Term | Definition |
|---|---|
| **Listing** | A published property entry on the marketplace with price, type, location, images, and contact info |
| **Property** | The managed real-world unit that has an owner, optional manager, and optional tenant. May or may not have an active listing |
| **Manager** | A user with the `manager` role who operates properties on behalf of owners |
| **Owner** | A user with the `owner` role who legally holds one or more properties |
| **Tenant** | A user with the `tenant` role assigned to a specific property |
| **Maintenance Request** | A ticket created by a tenant describing a problem in their property, tracked through pending → in_progress → completed |
| **Contact Actions** | Click-to-call and click-to-WhatsApp links on listing pages; no internal messaging system |
| **Admin** | Platform operator with full oversight and moderation capabilities |
| **Role** | The permission mode of a user: `user`, `manager`, `owner`, `tenant`, or `admin` |

---

## Non-Goals

The following are explicitly out of scope for MVP and near-term phases:

- In-app chat or messaging system
- Online payments or rent collection
- Contracts or legal document generation
- Mortgage or loan tools
- AI-powered recommendations
- Complex analytics dashboards
- Reviews and ratings system
- Verification/badge system (deferred to Could-Have)
- Notifications (deferred to Could-Have)

---

## Fixed Tech Decisions

| Concern | Decision |
|---|---|
| **Monorepo structure** | `apps/web-user`, `apps/web-admin`, `apps/mobile` + `packages/domain`, `packages/api-contracts`, `packages/data-access`, `packages/ui`, `packages/state`, `packages/config-*` |
| **Web apps** | Next.js (App Router only, no Pages Router) |
| **Mobile app** | Expo |
| **Language** | TypeScript strict mode everywhere; `any` is banned in application code |
| **Auth** | Supabase Auth |
| **Database** | PostgreSQL via Prisma (relational data); Supabase for realtime/storage where needed |
| **Input validation** | Zod at all API boundaries |
| **API error shape** | `{ success: true; data: T }` or `{ success: false; error: string; code: string }` |
| **Dependency direction** | Presentation → Application → Domain → Infrastructure. Domain has zero framework/DB imports |
| **Boundary enforcement** | ESLint import rules; no app-to-app imports; no framework imports in domain package |
| **Authorization** | All checks happen in server code (API routes/Server Actions); never client-side |
| **Shared logic** | Must live in `packages/domain`; never duplicated across apps |
