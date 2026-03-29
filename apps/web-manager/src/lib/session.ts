import type { AuthSession, UserRole } from "@hhousing/api-contracts";
import { createSupabaseServerClient } from "./supabase/server";
import { createAuthRepositoryFromEnv } from "@hhousing/data-access";

/**
 * Get auth session for server components by:
 * 1. Getting user from Supabase SSR client
 * 2. Querying DB for user's memberships
 * 3. Building AuthSession with first membership as primary
 * 
 * Returns null if:
 * - User not authenticated
 * - User has no memberships (not yet onboarded)
 */
export async function getServerAuthSession(): Promise<AuthSession | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || user === null) return null;

  const userId = user.id;

  try {
    const authRepo = createAuthRepositoryFromEnv(process.env);
    const memberships = await authRepo.listMembershipsByUserId(userId);

    // User must have at least one membership to access web-manager
    if (memberships.length === 0) {
      return null;
    }

    // Use first (most recent) membership as primary org context
    const primary = memberships[0];
    if (!primary) {
      return null;
    }

    return {
      userId,
      role: primary.role,
      organizationId: primary.organizationId,
      capabilities: primary.capabilities,
      memberships
    };
  } catch (error) {
    console.error("Failed to get server auth session", error);
    return null;
  }
}
