export interface DesktopAuthCallback {
  code: string | null;
  state: string | null;
  error: string | null;
}

function normalizePath(url: URL): string {
  const combined = `${url.hostname}${url.pathname}`.replace(/\/+$/, '');
  return combined.replace(/^\/+/, '');
}

export function parseDesktopAuthCallbackUrl(urlString: string): DesktopAuthCallback | null {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return null;
  }

  if (url.protocol !== 'haraka-property:') {
    return null;
  }

  const path = normalizePath(url);
  if (path !== 'auth/callback') {
    return null;
  }

  return {
    code: url.searchParams.get('code'),
    state: url.searchParams.get('state'),
    error: url.searchParams.get('error'),
  };
}

export function isSafeAppPath(pathname: string): boolean {
  return pathname.startsWith('/') && !pathname.startsWith('//') && !pathname.includes('://');
}
