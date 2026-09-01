import { app, BrowserWindow } from 'electron';
import * as path from 'node:path';
import {
  ensureWebManagerServer,
  stopWebManagerServer,
  type WebManagerServerHandle,
  type WebManagerServerMode,
} from './web-manager-server';

const isDev =
  !app.isPackaged &&
  !process.argv.includes('--production') &&
  process.env.ELECTRON_WEB_MANAGER_MODE !== 'start';
let webManagerServer: WebManagerServerHandle | null = null;

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

function createMainWindow(origin: string): BrowserWindow {
  const mainWindow = new BrowserWindow({
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

  void mainWindow.loadURL(origin);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  return mainWindow;
}

async function bootstrap(): Promise<void> {
  const serverMode = resolveServerMode();

  try {
    webManagerServer = await ensureWebManagerServer(serverMode);
    createMainWindow(webManagerServer.origin);
  } catch (error) {
    console.error('[desktop] Failed to start Haraka Property desktop shell:', error);
    app.quit();
  }
}

app.whenReady().then(() => {
  void bootstrap();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 && webManagerServer) {
      createMainWindow(webManagerServer.origin);
    }
  });
});

app.on('before-quit', () => {
  stopWebManagerServer(webManagerServer);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
