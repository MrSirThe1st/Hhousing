# Tenant Mobile Features and Screens

## Tenant Scope

**Goal:** "Live in the property, pay rent, report issues, communicate"

Tenant app is mobile-only.

## Core Features (Must-Have)

**Home:**
- Current lease summary (unit, address, rent amount)
- Next rent due date
- Payment status (paid/due/late)
- Quick actions: pay rent, report maintenance, message manager

**Payments:**
- Pay rent
- Payment methods
- Payment history
- Receipts download
- Pending/overdue rent alerts

**Maintenance:**
- Create maintenance request
- Upload photos
- Track status: `open -> in_progress -> resolved`
- Chat updates per request

**Messaging:**
- Chat with landlord/manager
- Receive announcements
- Attach images/files

**Documents:**
- Lease agreement
- Receipts
- Notices

**Profile:**
- Personal info
- Unit info
- Notifications settings

## Tenant Cannot

- See other units
- Access financial dashboards
- Manage properties
- Access web app

## UI Screen Flows

### Auth
- Splash
- Login
- Sign up
- Forgot password
- Verify email/SMS (optional)

### Home Dashboard
- Rent due card (amount, due date, status)
- Quick actions: pay rent, report issue, message manager
- Notifications preview

### Lease
- Current unit info
- Lease start/end dates
- Monthly rent breakdown
- Deposit info (if applicable)
- Contact landlord/manager action

### Payments
- Pay rent primary action
- Payment method selection
- Payment confirmation
- Payment history (month-by-month)
- Receipt detail

### Maintenance
- Create request action
- Request form: title, description, image upload
- Past requests list
- Request detail: status timeline, updates/messages

### Messages
- Conversation list
- Tenant <-> manager chat
- Optional attachments (images/files)

### Documents
- Lease agreement viewer
- Receipts list
- Download document view

### Profile
- Personal details
- Unit info
- Logout
- Settings (notifications, language)