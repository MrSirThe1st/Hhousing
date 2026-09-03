import { createSupabaseServerClient } from "../../../../../lib/supabase/server";
import { resolveAuthenticatedAppPath } from "../../../../../lib/desktop-auth/destination";

export async function GET(): Promise<Response> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json(
      { authenticated: false },
      { headers: { "cache-control": "no-store" } }
    );
  }

  const next = await resolveAuthenticatedAppPath(supabase, user.id);
  return Response.json(
    { authenticated: true, next },
    { headers: { "cache-control": "no-store" } }
  );
}
