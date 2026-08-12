# mobile-tenant

Tenant mobile application (Expo) — **Mon Espace**.

## Current surface

- Auth (login, forgot password, invite accept)
- Home + payments history (in-app pay gated off by default)
- Services / prestataires
- Account (profile, lease, settings, about, delete account)
- Biometrics + language onboarding

Out of scope for this release: maintenance, messages, documents, push notifications.

## Setup

1. Install dependencies from repo root:
	- `pnpm install`
2. Copy env file:
	- `cp apps/mobile-tenant/.env.example apps/mobile-tenant/.env`
3. Fill env values in `apps/mobile-tenant/.env`
4. Start app:
	- `pnpm -C apps/mobile-tenant dev`

## Environment variables

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_API_BASE_URL` — set this to `https://www.harakaproperty.com` for the hosted web-manager API
- `EXPO_PUBLIC_MOBILE_PAYMENTS_ENABLED` — leave `false` until PawaPay production is ready

## Notes

- Bundle ID: `com.hhousing.tenant`
- Version: `1.0.0` / iOS buildNumber `1` (bump on every store upload)
- Auth uses Supabase phone/password on mobile against the web-manager mobile API.
