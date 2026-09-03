import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { DESKTOP_AUTH_COOKIE_NAME } from "../../../lib/desktop-auth/constants";
import { resolveAuthenticatedAppPath } from "../../../lib/desktop-auth/destination";

export async function GET(request: Request): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const cookieStore = await cookies();
      if (cookieStore.get(DESKTOP_AUTH_COOKIE_NAME)?.value) {
        return NextResponse.redirect(`${origin}/desktop/auth/complete`);
      }

      const next = requestUrl.searchParams.get("next");
      if (next && next.startsWith("/") && !next.startsWith("/account")) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (user) {
        const destination = await resolveAuthenticatedAppPath(supabase, user.id);
        return NextResponse.redirect(`${origin}${destination}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth_callback_failed`);
}
