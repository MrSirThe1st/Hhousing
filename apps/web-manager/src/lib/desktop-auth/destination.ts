import type { SupabaseClient } from "@supabase/supabase-js";

export async function resolveAuthenticatedAppPath(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const { data: platformAdmins } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1);

  if (platformAdmins && platformAdmins.length > 0) {
    return "/admin";
  }

  const { data: memberships } = await supabase
    .from("organization_memberships")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  if (memberships && memberships.length > 0) {
    return "/dashboard";
  }

  const { data: ownerAccesses } = await supabase
    .from("owner_portal_accesses")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1);

  if (ownerAccesses && ownerAccesses.length > 0) {
    return "/owner-portal/dashboard";
  }

  return "/account-type";
}
