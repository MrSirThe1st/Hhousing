import { app, BrowserWindow, ipcMain, protocol, session } from 'electron';
import * as path from 'node:path';
import { buildRendererContentSecurityPolicy } from './content-security-policy';
import { createDesktopAuthController, probeAuthenticatedPath } from './desktop-auth';
import type { DesktopAuthIntent } from './desktop-auth-types';
import { DESKTOP_PROTOCOL } from './desktop-protocol';
import {
  ensureWebManagerServer,
  stopWebManagerServer,
  type WebManagerServerHandle,
  type WebManagerServerMode,
} from './web-manager-server';

protocol.registerSchemesAsPrivileged([
  {
    scheme: DESKTOP_PROTOCOL,
    privileges: { standard: true, secure: true },
  },
]);

function findProtocolUrl(argv: string[]): string | null {
  return argv.find((argument) => argument.startsWith(`${DESKTOP_PROTOCOL}://`)) ?? null;
}

const isDev =
  !app.isPackaged &&
  !process.argv.includes('--production') &&
  process.env.ELECTRON_WEB_MANAGER_MODE !== 'start';

let webManagerServer: WebManagerServerHandle | null = null;
let mainWindow: BrowserWindow | null = null;
let queuedCallbackUrl: string | null = findProtocolUrl(process.argv);
const authController = createDesktopAuthController({
  getOrigin: () => webManagerServer?.origin ?? null,
  getMainWindow: () => mainWindow,
});

function registerProtocolClient(): void {
  if (process.defaultApp) {
    const appPath = process.argv[1];
    if (appPath) {
      app.setAsDefaultProtocolClient(DESKTOP_PROTOCOL, process.execPath, [path.resolve(appPath)]);
      return;
    }
  }

  app.setAsDefaultProtocolClient(DESKTOP_PROTOCOL);
}

function resolveServerMode(): WebManagerServerMode {
  if (
    app.isPackaged ||
    process.argv.includes('--production') ||
    process.env.ELECTRON_WEB_MANAGER_MODE === 'start'
  ) {
    return 'start';
  }

  return 'dev';
}

function applyRendererContentSecurityPolicy(): void {
  const policy = buildRendererContentSecurityPolicy(isDev);

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    if (details.resourceType !== 'mainFrame') {
      callback({ responseHeaders: details.responseHeaders });
      return;
    }

    const responseHeaders = { ...details.responseHeaders };
    for (const headerName of Object.keys(responseHeaders)) {
      if (headerName.toLowerCase() === 'content-security-policy') {
        delete responseHeaders[headerName];
      }
    }

    callback({
      responseHeaders: {
        ...responseHeaders,
        'Content-Security-Policy': [policy],
      },
    });
  });
}

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    show: false,
    title: 'Haraka Property',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.once('ready-to-show', () => {
    window.show();
  });

  if (isDev) {
    window.webContents.openDevTools({ mode: 'detach' });
  }

  window.on('closed', () => {
    if (mainWindow === window) {
      mainWindow = null;
    }
  });

  return window;
}

function restoreMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  mainWindow.focus();
}

async function deliverCallbackUrl(urlString: string | null): Promise<void> {
  if (!urlString) {
    return;
  }

  if (!webManagerServer || !mainWindow || mainWindow.isDestroyed()) {
    queuedCallbackUrl = urlString;
    restoreMainWindow();
    return;
  }

  restoreMainWindow();
  await authController.handleCallbackUrl(urlString);
}

async function openAuthenticatedSurface(): Promise<void> {
  if (!webManagerServer || !mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  const nextPath = await probeAuthenticatedPath(webManagerServer.origin);
  if (nextPath) {
    await mainWindow.loadURL(`${webManagerServer.origin}${nextPath}`);
    return;
  }

  authController.showAuthScreen();
}

function registerAuthIpc(): void {
  ipcMain.handle('desktop-auth:start', async (_event, intent: unknown) => {
    if (intent !== 'login' && intent !== 'signup') {
      return { ok: false };
    }
    return authController.start(intent as DesktopAuthIntent);
  });

  ipcMain.handle('desktop-auth:cancel', () => {
    authController.cancel();
    return { ok: true };
  });
}

async function bootstrap(): Promise<void> {
  const serverMode = resolveServerMode();

  try {
    webManagerServer = await ensureWebManagerServer(serverMode);
    mainWindow = createMainWindow();
    await openAuthenticatedSurface();

    if (queuedCallbackUrl) {
      const url = queuedCallbackUrl;
      queuedCallbackUrl = null;
      await authController.handleCallbackUrl(url);
    }
  } catch (error) {
    console.error('[desktop] Failed to start Haraka Property desktop shell:', error);
    app.quit();
  }
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('open-url', (event, url) => {
    event.preventDefault();
    void deliverCallbackUrl(url);
  });

  app.on('second-instance', (_event, argv) => {
    void deliverCallbackUrl(findProtocolUrl(argv));
    restoreMainWindow();
  });

  app.whenReady().then(() => {
    registerProtocolClient();
    applyRendererContentSecurityPolicy();
    registerAuthIpc();
    void bootstrap();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0 && webManagerServer) {
        mainWindow = createMainWindow();
        void openAuthenticatedSurface();
      }
    });
  });
}

app.on('before-quit', () => {
  stopWebManagerServer(webManagerServer);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
