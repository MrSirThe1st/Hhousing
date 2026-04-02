# mobile-tenant

Tenant mobile application (Expo).

## Slice 5 status

Implemented now:
- Foundation scaffold (Expo + Expo Router + tabs)
- Auth foundation (Supabase login/logout + persisted session + route guards)

Next slices:
- Lease read view
- Maintenance submit flow
- Payments read view

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
- `EXPO_PUBLIC_API_BASE_URL`

## Screens scaffolded

- `/(auth)/login`
- `/(tabs)/index`
- `/(tabs)/lease`
- `/(tabs)/maintenance`
- `/(tabs)/payments`
- `/(tabs)/account`

## Notes

- This app currently uses Supabase email/password auth directly on mobile.
- API client foundation exists in `src/lib/api-client.ts` for next slices.
