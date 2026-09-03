import { spawn, type ChildProcess } from 'node:child_process';
import * as fs from 'node:fs';
import * as net from 'node:net';
import * as path from 'node:path';
import {
  resolveWebManagerHost,
  resolveWebManagerOrigin,
  resolveWebManagerPort,
  WEB_MANAGER_APP_ID,
  WEB_MANAGER_IDENTITY_PATH,
} from './web-manager-url';

export type WebManagerServerMode = 'dev' | 'start';

export interface WebManagerServerHandle {
  origin: string;
  spawnedByDesktop: boolean;
  childProcess: ChildProcess | null;
}

const WEB_MANAGER_DIR = path.resolve(__dirname, '../../web-manager');
const SERVER_READY_TIMEOUT_MS = 180_000;
const SERVER_POLL_INTERVAL_MS = 500;
const PORT_SEARCH_LIMIT = 100;

type ServerIdentity = 'haraka' | 'other' | 'down';

function getPnpmCommand(): string {
  return process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function identifyWebManager(origin: string): Promise<ServerIdentity> {
  try {
    const response = await fetch(`${origin}${WEB_MANAGER_IDENTITY_PATH}`, {
      method: 'GET',
      redirect: 'manual',
    });
    const contentType = response.headers.get('content-type') ?? '';
    if (!response.ok || !contentType.includes('application/json')) {
      return 'other';
    }

    const body: unknown = await response.json();
    if (
      typeof body === 'object' &&
      body !== null &&
      'app' in body &&
      (body as { app: unknown }).app === WEB_MANAGER_APP_ID
    ) {
      return 'haraka';
    }

    return 'other';
  } catch {
    return 'down';
  }
}

function isPortFree(port: number, hostname: string): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once('error', () => {
      resolve(false);
    });
    server.once('listening', () => {
      server.close(() => {
        resolve(true);
      });
    });
    server.listen(port, hostname);
  });
}

async function allocateWebManagerPort(): Promise<{ port: number; reuseExisting: boolean }> {
  const preferredPort = resolveWebManagerPort();
  const hostname = resolveWebManagerHost();
  const lastPort = Math.min(preferredPort + PORT_SEARCH_LIMIT, 65535);

  for (let port = preferredPort; port <= lastPort; port += 1) {
    const origin = resolveWebManagerOrigin(port);
    const identity = await identifyWebManager(origin);

    if (identity === 'haraka') {
      if (port !== preferredPort) {
        console.warn(
          `[desktop] Port ${preferredPort} is in use by another app. Reusing Haraka Property at ${origin}.`,
        );
      } else {
        console.log(`[desktop] Reusing Haraka Property at ${origin}`);
      }
      return { port, reuseExisting: true };
    }

    if (identity === 'other') {
      if (port === preferredPort) {
        console.warn(
          `[desktop] ${origin} is running a different app. Haraka Property will start on another port.`,
        );
      }
      continue;
    }

    if (await isPortFree(port, hostname)) {
      return { port, reuseExisting: false };
    }
  }

  throw new Error(
    `Could not find a free port for Haraka Property web-manager (tried ${preferredPort}–${lastPort}).`,
  );
}

async function waitForWebManager(origin: string): Promise<void> {
  const deadline = Date.now() + SERVER_READY_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if ((await identifyWebManager(origin)) === 'haraka') {
      return;
    }

    await sleep(SERVER_POLL_INTERVAL_MS);
  }

  throw new Error(`Timed out waiting for Haraka Property web-manager at ${origin}`);
}

function assertProductionBuildExists(): void {
  const buildIdPath = path.join(WEB_MANAGER_DIR, '.next', 'BUILD_ID');

  if (!fs.existsSync(buildIdPath)) {
    throw new Error(
      'web-manager production build not found. Run `pnpm -C apps/web-manager build` before starting the desktop app in production mode.',
    );
  }
}

function spawnWebManagerServer(mode: WebManagerServerMode, port: number): ChildProcess {
  if (mode === 'start') {
    assertProductionBuildExists();
  }

  const script = mode === 'dev' ? 'dev' : 'start';
  const childProcess = spawn(getPnpmCommand(), [script], {
    cwd: WEB_MANAGER_DIR,
    env: {
      ...process.env,
      PORT: String(port),
      HOSTNAME: resolveWebManagerHost(),
    },
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  childProcess.on('error', (error) => {
    console.error('[desktop] Failed to start web-manager server:', error);
  });

  return childProcess;
}

export async function ensureWebManagerServer(
  mode: WebManagerServerMode,
): Promise<WebManagerServerHandle> {
  const { port, reuseExisting } = await allocateWebManagerPort();
  const origin = resolveWebManagerOrigin(port);

  if (reuseExisting) {
    return {
      origin,
      spawnedByDesktop: false,
      childProcess: null,
    };
  }

  const childProcess = spawnWebManagerServer(mode, port);

  childProcess.on('exit', (code, signal) => {
    if (code !== 0 && code !== null) {
      console.error(
        `[desktop] web-manager server exited unexpectedly (code=${code}, signal=${signal ?? 'none'}).`,
      );
    }
  });

  await waitForWebManager(origin);
  console.log(`[desktop] Loading Haraka Property from ${origin}`);

  return {
    origin,
    spawnedByDesktop: true,
    childProcess,
  };
}

export function stopWebManagerServer(handle: WebManagerServerHandle | null): void {
  if (handle?.spawnedByDesktop && handle.childProcess && !handle.childProcess.killed) {
    handle.childProcess.kill();
  }
}
