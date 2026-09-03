import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DESKTOP_AUTH_CODE_TTL_MS,
  DESKTOP_PENDING_TTL_MS,
  type DesktopAuthIntent
} from "./constants";

export interface DesktopAuthPending {
  state: string;
  challenge: string;
  intent: DesktopAuthIntent;
  redirectUri: string;
  createdAt: number;
}

export interface DesktopAuthCodeRecord {
  code: string;
  state: string;
  challenge: string;
  accessToken: string;
  refreshToken: string;
  createdAt: number;
  expiresAt: number;
}

interface DesktopAuthFileStore {
  pending: Record<string, DesktopAuthPending>;
  codes: Record<string, DesktopAuthCodeRecord>;
}

function storePath(): string {
  return process.env.HH_DESKTOP_AUTH_STORE_PATH?.trim() || join(tmpdir(), "hhousing-desktop-auth.json");
}

function emptyStore(): DesktopAuthFileStore {
  return { pending: {}, codes: {} };
}

function readStore(): DesktopAuthFileStore {
  const filePath = storePath();
  if (!existsSync(filePath)) {
    return emptyStore();
  }

  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as DesktopAuthFileStore;
    return {
      pending: parsed.pending ?? {},
      codes: parsed.codes ?? {}
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: DesktopAuthFileStore): void {
  writeFileSync(storePath(), JSON.stringify(store), { encoding: "utf8", mode: 0o600 });
}

function pruneExpired(store: DesktopAuthFileStore, now = Date.now()): void {
  for (const [state, pending] of Object.entries(store.pending)) {
    if (now - pending.createdAt > DESKTOP_PENDING_TTL_MS) {
      delete store.pending[state];
    }
  }

  for (const [code, record] of Object.entries(store.codes)) {
    if (now >= record.expiresAt) {
      delete store.codes[code];
    }
  }
}

export function resetDesktopAuthStore(): void {
  const filePath = storePath();
  if (existsSync(filePath)) {
    unlinkSync(filePath);
  }
}

export function saveDesktopAuthPending(pending: DesktopAuthPending): void {
  const store = readStore();
  pruneExpired(store);
  store.pending[pending.state] = pending;
  writeStore(store);
}

export function getDesktopAuthPending(state: string): DesktopAuthPending | null {
  const store = readStore();
  pruneExpired(store);
  writeStore(store);
  return store.pending[state] ?? null;
}

export function takeDesktopAuthPending(state: string): DesktopAuthPending | null {
  const store = readStore();
  pruneExpired(store);
  const pending = store.pending[state] ?? null;
  if (pending) {
    delete store.pending[state];
  }
  writeStore(store);
  return pending;
}

export function mintDesktopAuthCode(input: {
  state: string;
  challenge: string;
  accessToken: string;
  refreshToken: string;
}): DesktopAuthCodeRecord {
  const store = readStore();
  pruneExpired(store);
  const now = Date.now();
  const record: DesktopAuthCodeRecord = {
    code: randomBytes(32).toString("base64url"),
    state: input.state,
    challenge: input.challenge,
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
    createdAt: now,
    expiresAt: now + DESKTOP_AUTH_CODE_TTL_MS
  };
  store.codes[record.code] = record;
  writeStore(store);
  return record;
}

export function consumeDesktopAuthCode(code: string): DesktopAuthCodeRecord | null {
  const store = readStore();
  pruneExpired(store);
  const record = store.codes[code] ?? null;
  if (record) {
    delete store.codes[code];
  }
  writeStore(store);
  if (!record || Date.now() >= record.expiresAt) {
    return null;
  }
  return record;
}
