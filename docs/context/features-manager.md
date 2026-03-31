# Manager Web Features and Screens

## Manager Scope

**Goal:** "Run the entire rental operation"

This is the main operator platform (`web-manager`).

## Core Features

**Dashboard (critical):**
- Total properties
- Occupancy rate (occupied vs vacant)
- Monthly income summary
- Overdue rent count
- Active maintenance requests

**Properties:**
- Create/edit property
- View property overview: units, income, occupancy, maintenance

**Units:**
- Create units
- Assign rent price
- Mark status (vacant/occupied/maintenance)
- Link tenant

**Tenants:**
- Tenant list
- Tenant profile: lease history, payments, maintenance requests
- Invite/assign tenant to unit

**Leases (core module):**
- Create lease (tenant + unit)
- Start/end dates
- Rent amount
- Deposit tracking
- Active/expired leases

**Payments:**
- Payment tracking table
- Paid/unpaid/late filtering
- Record manual payments (cash/mobile money)
- Export reports

**Maintenance (high-value module):**
- All tenant requests
- Assign staff/contractor
- Update status
- Track resolution time

**Messaging:**
- Tenant conversations
- Broadcast messages (all tenants or per property)

**Documents:**
- Upload leases
- Upload notices
- Attach to property/unit/tenant

**Analytics:**
- Occupancy rate
- Monthly income trends
- Payment completion rate
- Maintenance frequency

## Manager Cannot

- Access tenant mobile-only features
- Access system admin tools
- See other organizations

For account-type differences (`self_managed_owner`, `manager_for_others`, `mixed_operator`), see [roles-and-auth.md](./roles-and-auth.md).

## UI Screen Flows

### Auth
- Login
- Forgot password

### Shell Layout
- Sidebar navigation
- Top bar (search, notifications, profile)

### Dashboard
- Occupancy overview cards
- Monthly income chart
- Overdue rent list
- Active maintenance requests

### Properties
- Properties list
- Create property
- Property detail: units overview, occupancy, income summary

### Property Detail
- Header (name, address)
- Units list
- Income breakdown
- Maintenance summary

### Units
- Units list
- Add unit modal
- Unit detail: status, rent, assigned tenant, lease history

### Tenants
- Tenant list
- Add tenant
- Tenant profile: personal info, current lease, payment history, maintenance history

### Leases
- Active leases list
- Create lease (assign tenant + unit, rent amount, dates)
- Lease detail

### Payments
- Payments table
- Filters: paid/unpaid/late
- Mark payment as received
- Payment detail

### Maintenance
- Request list
- Request detail: description, images, status control
- Assign task screen

### Messaging
- Conversation list
- Chat view
- Broadcast composer

### Documents
- Upload document
- Attach to tenant/unit/property
- Document library

### Analytics
- Occupancy chart
- Income trends
- Payment completion rate
- Maintenance frequency