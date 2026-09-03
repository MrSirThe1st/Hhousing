import { NextResponse } from "next/server";
import {
  DESKTOP_AUTH_COOKIE_NAME,
  DESKTOP_AUTH_REDIRECT_URI,
  type DesktopAuthIntent
} from "../../../../lib/desktop-auth/constants";
import { desktopAuthCookieOptions } from "../../../../lib/desktop-auth/cookie";
import { isValidPkceChallenge, isValidPkceState } from "../../../../lib/desktop-auth/pkce";
import { saveDesktopAuthPending } from "../../../../lib/desktop-auth/store";

function parseIntent(value: string | null): DesktopAuthIntent | null {
  if (value === "login" || value === "signup") {
    return value;
  }
  return null;
}

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const state = url.searchParams.get("state")?.trim() ?? "";
  const challenge = url.searchParams.get("challenge")?.trim() ?? "";
  const intent = parseIntent(url.searchParams.get("intent"));
  const redirectUri = url.searchParams.get("redirect_uri")?.trim() ?? "";

  if (!isValidPkceState(state) || !isValidPkceChallenge(challenge) || !intent) {
    return NextResponse.redirect(new URL("/login?error=desktop_auth_invalid", url.origin));
  }

  if (redirectUri !== DESKTOP_AUTH_REDIRECT_URI) {
    return NextResponse.redirect(new URL("/login?error=desktop_auth_invalid", url.origin));
  }

  saveDesktopAuthPending({
    state,
    challenge,
    intent,
    redirectUri,
    createdAt: Date.now()
  });

  const destination = new URL(intent === "signup" ? "/signup" : "/login", url.origin);
  const response = NextResponse.redirect(destination);
  response.cookies.set(DESKTOP_AUTH_COOKIE_NAME, state, desktopAuthCookieOptions());
  return response;
}
