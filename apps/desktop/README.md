# desktop

Electron desktop shell for Haraka Property. It loads the existing `apps/web-manager` Next.js application in a secure `BrowserWindow` — no duplicate desktop UI.

This package is isolated from the Expo mobile app (`apps/mobile-tenant`).

## Development

From the repository root:

```bash
pnpm desktop:dev
```

This will:

1. Compile the Electron main process
2. Start `apps/web-manager` via `next dev` (unless a Haraka identity endpoint is already running)
3. Open Electron
4. If a session already exists, open the Property Dashboard (or admin / onboarding)
5. Otherwise show the desktop authentication screen and complete sign-in in the system browser

Custom protocol used for the auth callback:

```text
haraka-property://auth/callback
```

Configure the dev server port with the standard Next.js `PORT` env var (default: `3000`).

## Production (foundation)

Build web-manager and launch Electron against `next start`:

```bash
pnpm desktop:start
```

Packaging/installer distribution is not implemented yet.

## Security

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- Preload exposes `window.desktop.platform` plus a narrow auth IPC bridge
- The deep-link callback carries only a short-lived authorization code and state — never Supabase tokens
