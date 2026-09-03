/**
 * CSP for the Electron renderer that loads web-manager.
 *
 * Next.js / React development uses eval() for HMR and error stacks, so `unsafe-eval`
 * is required in `next dev`. Electron will still warn in that mode; the warning is
 * gone for `next start` and packaged builds, which omit `unsafe-eval`.
 */
export function buildRendererContentSecurityPolicy(isDev: boolean): string {
  const scriptSrc = isDev
    ? "'self' 'unsafe-inline' 'unsafe-eval'"
    : "'self' 'unsafe-inline'";

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' ws://127.0.0.1:* ws://localhost:* wss: https:",
    "media-src 'self' blob: data:",
    "worker-src 'self' blob:",
    "frame-src 'self' https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}
