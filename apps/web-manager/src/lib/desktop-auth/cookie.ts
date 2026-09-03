import type { NextRequest } from "next/server";
import {
  DESKTOP_AUTH_COOKIE_MAX_AGE_SECONDS,
  DESKTOP_AUTH_COOKIE_NAME
} from "./constants";

export function readDesktopAuthState(request: NextRequest): string | null {
  const value = request.cookies.get(DESKTOP_AUTH_COOKIE_NAME)?.value?.trim();
  return value ? value : null;
}

export function desktopAuthCookieOptions(maxAge = DESKTOP_AUTH_COOKIE_MAX_AGE_SECONDS): {
  httpOnly: true;
  sameSite: "lax";
  path: "/";
  maxAge: number;
} {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge
  };
}
