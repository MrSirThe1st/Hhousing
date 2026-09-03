import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../../lib/supabase/server";
import { resolveAuthenticatedAppPath } from "../../../../../lib/desktop-auth/destination";
import { verifierMatchesChallenge, isValidPkceState, isValidPkceVerifier } from "../../../../../lib/desktop-auth/pkce";
import { consumeDesktopAuthCode } from "../../../../../lib/desktop-auth/store";

type ExchangeBody = {
  code?: unknown;
  verifier?: unknown;
  state?: unknown;
};

export async function POST(request: Request): Promise<NextResponse> {
  let body: ExchangeBody;
  try {
    body = (await request.json()) as ExchangeBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  const code = typeof body.code === "string" ? body.code.trim() : "";
  const verifier = typeof body.verifier === "string" ? body.verifier.trim() : "";
  const state = typeof body.state === "string" ? body.state.trim() : "";

  if (!code || !isValidPkceVerifier(verifier) || !isValidPkceState(state)) {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  const record = consumeDesktopAuthCode(code);
  if (!record || record.state !== state || !verifierMatchesChallenge(verifier, record.challenge)) {
    return NextResponse.json({ ok: false, error: "invalid_grant" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.setSession({
    access_token: record.accessToken,
    refresh_token: record.refreshToken
  });

  if (error || !data.user) {
    return NextResponse.json({ ok: false, error: "session_failed" }, { status: 400 });
  }

  const next = await resolveAuthenticatedAppPath(supabase, data.user.id);
  return NextResponse.json(
    { ok: true, next },
    { headers: { "cache-control": "no-store" } }
  );
}
