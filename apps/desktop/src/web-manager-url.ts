const DEFAULT_WEB_MANAGER_HOST = '127.0.0.1';
const DEFAULT_WEB_MANAGER_PORT = 3000;

export const WEB_MANAGER_APP_ID = 'haraka-web-manager';
export const WEB_MANAGER_IDENTITY_PATH = '/api/desktop/identity';

export function resolveWebManagerHost(): string {
  return process.env.WEB_MANAGER_HOST?.trim() || DEFAULT_WEB_MANAGER_HOST;
}

export function resolveWebManagerPort(): number {
  const rawPort = process.env.PORT ?? process.env.WEB_MANAGER_PORT;

  if (rawPort === undefined || rawPort.trim() === '') {
    return DEFAULT_WEB_MANAGER_PORT;
  }

  const parsedPort = Number.parseInt(rawPort, 10);

  if (!Number.isInteger(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
    throw new Error(
      `Invalid web-manager port "${rawPort}". Set PORT or WEB_MANAGER_PORT to an integer between 1 and 65535.`,
    );
  }

  return parsedPort;
}

export function resolveWebManagerOrigin(port = resolveWebManagerPort()): string {
  return `http://${resolveWebManagerHost()}:${port}`;
}
