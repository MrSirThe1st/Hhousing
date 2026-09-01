import { spawn, type ChildProcess } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { resolveWebManagerOrigin, resolveWebManagerPort } from './web-manager-url';

export type WebManagerServerMode = 'dev' | 'start';

export interface WebManagerServerHandle {
  origin: string;
  spawnedByDesktop: boolean;
  childProcess: ChildProcess | null;
}

const WEB_MANAGER_DIR = path.resolve(__dirname, '../../web-manager');
const SERVER_READY_TIMEOUT_MS = 180_000;
const SERVER_POLL_INTERVAL_MS = 500;

function getPnpmCommand(): string {
  return process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
}

async function isServerReachable(origin: string): Promise<boolean> {
  try {
    await fetch(origin, {
      method: 'GET',
      redirect: 'manual',
    });

    return true;
  } catch {
    return false;
  }
}

async function waitForServer(origin: string): Promise<void> {
  const deadline = Date.now() + SERVER_READY_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (await isServerReachable(origin)) {
      return;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, SERVER_POLL_INTERVAL_MS);
    });
  }

  throw new Error(`Timed out waiting for web-manager at ${origin}`);
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
      HOSTNAME: process.env.WEB_MANAGER_HOST?.trim() || '127.0.0.1',
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
  const port = resolveWebManagerPort();
  const origin = resolveWebManagerOrigin(port);

  if (await isServerReachable(origin)) {
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

  await waitForServer(origin);

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
