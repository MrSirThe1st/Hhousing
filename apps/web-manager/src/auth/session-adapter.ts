import { createClient } from "@supabase/supabase-js";
import { createAuthRepositoryFromEnv } from "@hhousing/data-access";
import type { AuthSession, UserRole } from "@hhousing/api-contracts";

const VALID_ROLES: readonly UserRole[] = ["tenant", "landlord", "property_manager", "platform_admin"];

type SupabaseLikeUser = {
  id: string;
  app_metadata?: unknown;
  user_metadata?: unknown;
};

type SupabaseGetUserResult = {
  data: {
    user: SupabaseLikeUser | null;
  };
  error: unknown;
};

interface SupabaseAuthLikeClient {
  auth: {
    getUser: (jwt: string) => Promise<SupabaseGetUserResult>;
  };
}

function getBearerToken(headers: Headers): string | null {
  const authorization = headers.get("authorization");
  if (!authorization) {
    return null;
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return null;
  }

  const token = match[1]?.trim();
  return token ? token : null;
}

function createSupabaseClientFromEnv(): SupabaseAuthLikeClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!supabaseUrl || !publishableKey) {
    return null;
  }

  return createClient(supabaseUrl, publishableKey);
}

/**
 * Lightweight auth validation for onboarding/account creation.
 * Validates Supabase token and returns userId WITHOUT checking memberships.
 *
 * Use this for endpoints that create the first membership.
 *
 * Returns null if:
 * - No Authorization header
 * - Token invalid
 * - User not found in Supabase
 */
export async function extractUserIdFromRequest(request: Request): Promise<string | null> {
  const token = getBearerToken(request.headers);
  if (token === null) {
    return null;
  }

  const supabaseClient = createSupabaseClientFromEnv();
  if (supabaseClient === null) {
    return null;
  }

  const { data, error } = await supabaseClient.auth.getUser(token);
  if (error || data.user === null) {
    return null;
  }

  return data.user.id;
}

/**
 * Extract auth session from request by:
 * 1. Getting Bearer token from Authorization header
 * 2. Validating token with Supabase
 * 3. Querying DB for user's memberships
 * 4. Building AuthSession with first membership as primary (if available)
 *
 * Returns null if:
 * - No Authorization header
 * - Token invalid
 * - User not found in Supabase
 * - User has no memberships in DB (not yet onboarded)
 */
export async function extractAuthSessionFromRequest(request: Request): Promise<AuthSession | null> {
  const token = getBearerToken(request.headers);
  if (token === null) {
    return null;
  }

  const supabaseClient = createSupabaseClientFromEnv();
  if (supabaseClient === null) {
    return null;
  }

  const { data, error } = await supabaseClient.auth.getUser(token);
  if (error || data.user === null) {
    return null;
  }

  const userId = data.user.id;

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
    console.error("Failed to extract auth session", error);
    return null;
  }
}
