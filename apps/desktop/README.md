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
2. Start `apps/web-manager` via `next dev` (unless it is already running on the configured port)
3. Open Electron and load the web-manager UI

Configure the dev server port with the standard Next.js `PORT` env var (default: `3000`, matching mobile/web local conventions).

If web-manager is already running (for example via `pnpm -C apps/web-manager dev`), Electron reuses that server instead of starting a second one.

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
- Preload exposes only a minimal `window.desktop.platform` bridge
