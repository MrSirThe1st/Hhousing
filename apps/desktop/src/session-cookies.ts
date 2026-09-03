import type { Session } from 'electron';

interface ParsedSetCookie {
  name: string;
  value: string;
  path?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'lax' | 'strict' | 'no_restriction';
  expirationDate?: number;
}

function parseSameSite(value: string): ParsedSetCookie['sameSite'] {
  const normalized = value.toLowerCase();
  if (normalized === 'lax') {
    return 'lax';
  }
  if (normalized === 'strict') {
    return 'strict';
  }
  if (normalized === 'none') {
    return 'no_restriction';
  }
  return undefined;
}

export function parseSetCookieHeader(header: string): ParsedSetCookie | null {
  const parts = header.split(';').map((part) => part.trim()).filter(Boolean);
  const first = parts[0];
  if (!first) {
    return null;
  }

  const separator = first.indexOf('=');
  if (separator <= 0) {
    return null;
  }

  const parsed: ParsedSetCookie = {
    name: first.slice(0, separator),
    value: first.slice(separator + 1),
  };

  for (const attribute of parts.slice(1)) {
    const [rawName, ...rawValue] = attribute.split('=');
    const name = rawName.trim().toLowerCase();
    const value = rawValue.join('=').trim();

    if (name === 'path' && value) {
      parsed.path = value;
    } else if (name === 'httponly') {
      parsed.httpOnly = true;
    } else if (name === 'secure') {
      parsed.secure = true;
    } else if (name === 'samesite' && value) {
      parsed.sameSite = parseSameSite(value);
    } else if (name === 'max-age' && value) {
      const maxAge = Number.parseInt(value, 10);
      if (Number.isFinite(maxAge)) {
        parsed.expirationDate = Math.floor(Date.now() / 1000) + maxAge;
      }
    }
  }

  return parsed;
}

export async function applyResponseCookies(
  ses: Session,
  requestUrl: string,
  response: Response,
): Promise<void> {
  const headers =
    typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : [];

  for (const header of headers) {
    const parsed = parseSetCookieHeader(header);
    if (!parsed) {
      continue;
    }

    await ses.cookies.set({
      url: requestUrl,
      name: parsed.name,
      value: parsed.value,
      path: parsed.path ?? '/',
      httpOnly: parsed.httpOnly,
      secure: parsed.secure,
      sameSite: parsed.sameSite,
      expirationDate: parsed.expirationDate,
    });
  }
}
