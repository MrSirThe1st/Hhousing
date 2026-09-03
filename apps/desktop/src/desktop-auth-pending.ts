import * as fs from 'node:fs';
import * as path from 'node:path';
import { app } from 'electron';
import type { DesktopAuthIntent } from './desktop-auth-types';

export interface PersistedDesktopAuthRequest {
  state: string;
  verifier: string;
  intent: DesktopAuthIntent;
  createdAt: number;
  expiresAt: number;
}

function pendingPath(): string {
  return path.join(app.getPath('userData'), 'desktop-auth-pending.json');
}

export function savePersistedDesktopAuthRequest(request: PersistedDesktopAuthRequest): void {
  const filePath = pendingPath();
  fs.writeFileSync(filePath, JSON.stringify(request), { encoding: 'utf8', mode: 0o600 });
}

export function readPersistedDesktopAuthRequest(): PersistedDesktopAuthRequest | null {
  const filePath = pendingPath();
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as PersistedDesktopAuthRequest;
    if (
      typeof parsed.state !== 'string' ||
      typeof parsed.verifier !== 'string' ||
      (parsed.intent !== 'login' && parsed.intent !== 'signup') ||
      typeof parsed.expiresAt !== 'number'
    ) {
      clearPersistedDesktopAuthRequest();
      return null;
    }
    if (Date.now() >= parsed.expiresAt) {
      clearPersistedDesktopAuthRequest();
      return null;
    }
    return parsed;
  } catch {
    clearPersistedDesktopAuthRequest();
    return null;
  }
}

export function clearPersistedDesktopAuthRequest(): void {
  const filePath = pendingPath();
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
