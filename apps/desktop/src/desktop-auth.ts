import { BrowserWindow, app, session, shell, type Session } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { AUTH_SCREEN_HTML } from './auth-screen-html';
import { isSafeAppPath, parseDesktopAuthCallbackUrl } from './desktop-auth-callback';
import {
  clearPersistedDesktopAuthRequest,
  readPersistedDesktopAuthRequest,
  savePersistedDesktopAuthRequest,
} from './desktop-auth-pending';
import { DESKTOP_AUTH_REDIRECT_URI, DESKTOP_AUTH_TIMEOUT_MS } from './desktop-protocol';
import type { DesktopAuthIntent, DesktopAuthUiStatus } from './desktop-auth-types';
import { createOAuthState, createPkcePair } from './pkce';
import { applyResponseCookies } from './session-cookies';

export interface DesktopAuthController {
  start: (intent: DesktopAuthIntent) => Promise<{ ok: boolean }>;
  cancel: () => void;
  handleCallbackUrl: (urlString: string) => Promise<void>;
  showAuthScreen: () => void;
}

export function createDesktopAuthController(options: {
  getOrigin: () => string | null;
  getMainWindow: () => BrowserWindow | null;
}): DesktopAuthController {
  let timeout: NodeJS.Timeout | null = null;
  let inFlightState: string | null = null;

  function getSession(): Session {
    return session.defaultSession;
  }

  function emitStatus(status: DesktopAuthUiStatus): void {
    const window = options.getMainWindow();
    if (window && !window.isDestroyed()) {
      window.webContents.send('desktop-auth:status', status);
    }
  }

  function clearTimer(): void {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  }

  function focusMainWindow(): void {
    const window = options.getMainWindow();
    if (!window || window.isDestroyed()) {
      return;
    }
    if (window.isMinimized()) {
      window.restore();
    }
    window.show();
    window.focus();
    app.focus({ steal: true });
  }

  function authScreenPath(): string {
    const filePath = path.join(app.getPath('userData'), 'auth-screen.html');
    fs.writeFileSync(filePath, AUTH_SCREEN_HTML, 'utf8');
    return filePath;
  }

  function showAuthScreen(): void {
    const window = options.getMainWindow();
    if (!window || window.isDestroyed()) {
      return;
    }
    void window.loadFile(authScreenPath());
  }

  function fail(message: string): void {
    clearTimer();
    inFlightState = null;
    clearPersistedDesktopAuthRequest();

    const window = options.getMainWindow();
    const alreadyOnAuthScreen =
      window !== null && !window.isDestroyed() && window.webContents.getURL().startsWith('file:');

    if (!alreadyOnAuthScreen) {
      showAuthScreen();
      window?.webContents.once('did-finish-load', () => {
        emitStatus({ status: 'error', message });
      });
      return;
    }

    emitStatus({ status: 'error', message });
  }

  async function exchangeAndOpen(code: string, verifier: string, state: string): Promise<void> {
    const origin = options.getOrigin();
    if (!origin) {
      fail('Le serveur Haraka Property est indisponible.');
      return;
    }

    emitStatus({ status: 'exchanging' });
    const exchangeUrl = `${origin}/api/desktop/auth/exchange`;
    const response = await getSession().fetch(exchangeUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ code, verifier, state }),
    });

    await applyResponseCookies(getSession(), origin, response);

    const payload: unknown = await response.json().catch(() => null);
    if (
      !response.ok ||
      !payload ||
      typeof payload !== 'object' ||
      (payload as { ok?: unknown }).ok !== true ||
      typeof (payload as { next?: unknown }).next !== 'string' ||
      !isSafeAppPath((payload as { next: string }).next)
    ) {
      fail('La connexion a échoué. Réessayez.');
      return;
    }

    clearTimer();
    inFlightState = null;
    clearPersistedDesktopAuthRequest();
    focusMainWindow();

    const window = options.getMainWindow();
    if (!window || window.isDestroyed()) {
      return;
    }
    await window.loadURL(`${origin}${(payload as { next: string }).next}`);
  }

  async function handleCallbackUrl(urlString: string): Promise<void> {
    const parsed = parseDesktopAuthCallbackUrl(urlString);
    if (!parsed) {
      fail('Le retour de connexion est invalide.');
      return;
    }

    if (parsed.error) {
      fail(parsed.error === 'access_denied' ? 'Connexion annulée.' : 'La connexion a échoué.');
      return;
    }

    const pending = readPersistedDesktopAuthRequest();
    const window = options.getMainWindow();
    const showingApp =
      window !== null && !window.isDestroyed() && !window.webContents.getURL().startsWith('file:');

    if (!pending || !parsed.code || !parsed.state || parsed.state !== pending.state) {
      if (showingApp && !pending) {
        return;
      }
      fail('Le retour de connexion est invalide ou a expiré.');
      return;
    }

    if (inFlightState && parsed.state !== inFlightState) {
      fail('Le retour de connexion ne correspond pas à cette demande.');
      return;
    }

    try {
      await exchangeAndOpen(parsed.code, pending.verifier, parsed.state);
    } catch (error) {
      console.error('[desktop] Auth exchange failed:', error);
      fail('La connexion a échoué. Réessayez.');
    }
  }

  async function start(intent: DesktopAuthIntent): Promise<{ ok: boolean }> {
    const origin = options.getOrigin();
    const window = options.getMainWindow();
    if (!origin || !window || window.isDestroyed()) {
      fail('Le serveur Haraka Property est indisponible.');
      return { ok: false };
    }

    const { verifier, challenge } = createPkcePair();
    const state = createOAuthState();
    const startUrl = new URL('/desktop/auth/start', origin);
    startUrl.searchParams.set('state', state);
    startUrl.searchParams.set('challenge', challenge);
    startUrl.searchParams.set('intent', intent);
    startUrl.searchParams.set('redirect_uri', DESKTOP_AUTH_REDIRECT_URI);

    savePersistedDesktopAuthRequest({
      state,
      verifier,
      intent,
      createdAt: Date.now(),
      expiresAt: Date.now() + DESKTOP_AUTH_TIMEOUT_MS,
    });
    inFlightState = state;
    clearTimer();
    timeout = setTimeout(() => {
      fail('Le délai de connexion a expiré. Réessayez.');
    }, DESKTOP_AUTH_TIMEOUT_MS);

    emitStatus({ status: 'waiting' });
    await shell.openExternal(startUrl.toString());
    return { ok: true };
  }

  function cancel(): void {
    clearTimer();
    inFlightState = null;
    clearPersistedDesktopAuthRequest();
    emitStatus({ status: 'idle' });
  }

  return {
    start,
    cancel,
    handleCallbackUrl,
    showAuthScreen,
  };
}

export async function probeAuthenticatedPath(origin: string, ses = session.defaultSession): Promise<string | null> {
  try {
    const response = await ses.fetch(`${origin}/api/desktop/auth/session`, {
      headers: { accept: 'application/json' },
    });
    if (!response.ok) {
      return null;
    }
    const payload: unknown = await response.json();
    if (
      payload &&
      typeof payload === 'object' &&
      (payload as { authenticated?: unknown }).authenticated === true &&
      typeof (payload as { next?: unknown }).next === 'string' &&
      isSafeAppPath((payload as { next: string }).next)
    ) {
      return (payload as { next: string }).next;
    }
  } catch (error) {
    console.error('[desktop] Session probe failed:', error);
  }

  return null;
}
