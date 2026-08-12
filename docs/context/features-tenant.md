# Tenant Mobile Features and Screens

## Tenant Scope

**Goal:** "Live in the property, see rent status, contact building services"

Tenant app is mobile-only (`apps/mobile-tenant`, Mon Espace).

## Current Release (Must-Have)

**Home:**
- Current lease summary (unit, address, rent amount)
- Next rent due date / payment status (paid/due/late)
- Recent payments

**Payments:**
- Payment history
- Pending/overdue visibility
- In-app Mobile Money pay is gated off until production-ready (`EXPO_PUBLIC_MOBILE_PAYMENTS_ENABLED`)

**Services / Prestataires:**
- View providers enabled for the tenant's building
- Trust labels (platform-verified vs manager-added)
- Call (`tel:`) and WhatsApp contact

**Profile / Account:**
- Personal info edit
- Lease / "my home" view
- Settings (language, biometrics, theme, hide amounts, change password, delete account)
- About / privacy / terms / support

**Auth / Onboarding:**
- Login, forgot password, invite accept
- Language + biometric onboarding

## Explicitly Out of Scope (Do Not Re-Add for This Release)

- **Maintenance** requests (create, photos, status tracking) — removed; no camera/mic/photo permissions
- **Messaging** inbox with landlord/manager
- **Documents** viewer/downloads in-app
- **Push / in-app notification settings**

## Tenant Cannot

- See other units
- Access financial dashboards
- Manage properties
- Access web app

## UI Screen Flows (Current)

### Auth
- Splash
- Login
- Forgot password
- Accept invite

### Home Dashboard
- Rent due card (amount, due date, status)
- Useful contacts / services preview
- Recent payments

### Lease (under Menu)
- Current unit info
- Lease start/end dates
- Monthly rent

### Payments
- Due summary
- Payment history (month-by-month)

### Services / Prestataires
- Provider list by category
- Detail with trust badge
- Call / WhatsApp actions

### Profile / Menu
- Personal details
- Settings (language, biometrics, theme — no notifications)
- Logout / delete account
