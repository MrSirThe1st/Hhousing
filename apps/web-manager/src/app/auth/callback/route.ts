import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createSupabaseServerClient();
    
    // Exchange the one-time code for a session cookie
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      const next = requestUrl.searchParams.get("next");
      if (next && next.startsWith("/")) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (user) {
        // 1. Platform admin (same login, role-based routing)
        const { data: platformAdmins } = await supabase
          .from("platform_admins")
          .select("user_id")
          .eq("user_id", user.id)
          .eq("status", "active")
          .limit(1);

        if (platformAdmins && platformAdmins.length > 0) {
          return NextResponse.redirect(`${origin}/admin`);
        }

        // 2. Organization membership → operator dashboard
        const { data: memberships } = await supabase
          .from("organization_memberships")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);

        if (memberships && memberships.length > 0) {
          return NextResponse.redirect(`${origin}/dashboard`);
        }

        // 3. Active owner portal access
        const { data: ownerAccesses } = await supabase
          .from("owner_portal_accesses")
          .select("id")
          .eq("user_id", user.id)
          .eq("status", "active")
          .limit(1);

        if (ownerAccesses && ownerAccesses.length > 0) {
          return NextResponse.redirect(`${origin}/owner-portal/dashboard`);
        }

        // 4. Fallback: new oauth signup takes the user to the account-type picker
        return NextResponse.redirect(`${origin}/account-type`);
      }
    }
  }

  // Fallback on failure
  return NextResponse.redirect(`${origin}/login?error=oauth_callback_failed`);
}
