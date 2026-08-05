import { cache } from "react";
import type { AuthSession } from "@hhousing/api-contracts";
import { createSupabaseServerClient } from "./supabase/server";
import { resolveAuthSessionForUserId } from "../auth/resolve-session";

/**
 * Get auth session for server components.
 * Returns null if unauthenticated, suspended, or without usable membership / platform admin.
 */
export const getServerAuthSession = cache(async function getServerAuthSession(): Promise<AuthSession | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || user === null) return null;

  return resolveAuthSessionForUserId(user.id);
});
