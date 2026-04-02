# Mobile Bugfixes

## 2026-04-02 - iOS crash on startup (`non-std C++ exception` / `RCTFatal`)

### Symptom
- iOS simulator crashed at startup with native stack trace:
  - `non-std C++ exception`
  - `RCTFatal`
  - `RCTJSThreadManager`
- Metro logs were often empty or not actionable.

### Root cause
- Expo SDK dependency mismatch in `apps/mobile-tenant`.
- `expo-doctor` reported incompatible versions for key runtime packages (`react-native`, `react`, `expo-status-bar`, `expo-constants`, async storage).
- Missing required peer dependency: `expo-linking`.
- Extra `package-lock.json` in a pnpm workspace caused package-manager confusion during Expo checks.

### Fix applied
1. Aligned mobile dependencies to Expo SDK 53 compatible versions in `apps/mobile-tenant/package.json`.
2. Installed missing peer dependency:
   - `expo-linking`.
3. Removed root `package-lock.json` (repo uses pnpm).
4. Added `.expo/` to root `.gitignore`.
5. Cleaned deprecated Babel setup by removing `expo-router/babel` plugin from `apps/mobile-tenant/babel.config.js`.
6. Verified environment keys exist in `apps/mobile-tenant/.env`:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `EXPO_PUBLIC_API_BASE_URL`

### Verification
- `npx expo-doctor` -> `17/17 checks passed`.
- `pnpm -C apps/mobile-tenant typecheck` -> passed.
- `npx expo export --platform ios` -> iOS bundle succeeded.

### Recovery steps if it reappears
1. Stop Metro.
2. Clear caches/state:
   - `lsof -t -i :8081 | xargs kill -9`
   - `rm -rf apps/mobile-tenant/.expo`
   - `rm -rf /tmp/metro-*`
3. Restart with clean cache:
   - `pnpm -C apps/mobile-tenant dev -- --clear`
4. If still failing, remove the app from simulator and relaunch.


