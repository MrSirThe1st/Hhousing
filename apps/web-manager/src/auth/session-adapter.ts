import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAuthRepositoryFromEnv } from "@hhousing/data-access";
import type { ApiResult, AuthSession, UserRole } from "@hhousing/api-contracts";

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

export async function extractTenantSessionFromRequest(
  request: Request
): Promise<ApiResult<AuthSession>> {
  const token = getBearerToken(request.headers);
  if (token === null) {
    return {
      success: false,
      code: "UNAUTHORIZED",
      error: "Authentication required"
    };
  }

  const supabaseClient = createSupabaseClientFromEnv();
  if (supabaseClient === null) {
    return {
      success: false,
      code: "UNAUTHORIZED",
      error: "Authentication required"
    };
  }

  const { data, error } = await supabaseClient.auth.getUser(token);
  if (error || data.user === null) {
    return {
      success: false,
      code: "UNAUTHORIZED",
      error: "Authentication required"
    };
  }

  const userId = data.user.id;

  try {
    const authRepo = createAuthRepositoryFromEnv(process.env);
    const memberships = await authRepo.listMembershipsByUserId(userId);

    if (memberships.length === 0) {
      return {
        success: false,
        code: "FORBIDDEN",
        error: "Account activated, but this user is not linked to a tenant invitation yet"
      };
    }

    const primary = memberships[0];
    if (!primary) {
      return {
        success: false,
        code: "FORBIDDEN",
        error: "Account activated, but this user is not linked to a tenant invitation yet"
      };
    }

    const session: AuthSession = {
      userId,
      role: primary.role,
      organizationId: primary.organizationId,
      capabilities: primary.capabilities,
      memberships
    };

    if (session.role !== "tenant") {
      return {
        success: false,
        code: "FORBIDDEN",
        error: "This endpoint is only available to tenants"
      };
    }

    if (!session.organizationId) {
      return {
        success: false,
        code: "FORBIDDEN",
        error: "Organization context is required"
      };
    }

    return {
      success: true,
      data: session
    };
  } catch (caughtError) {
    console.error("Failed to extract tenant auth session", caughtError);
    return {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to resolve tenant account access"
    };
  }
}

/**
 * Extract auth session from request cookies (for API routes).
 *
 * 1. Creates Supabase client with cookie support
 * 2. Gets authenticated user from cookies
 * 3. Queries DB for user's memberships
 * 4. Builds AuthSession with first membership as primary
 *
 * Returns null if:
 * - User not authenticated
 * - User has no memberships (not yet onboarded)
 */
export async function extractAuthSessionFromCookies(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        }
      }
    }
  );

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user === null) {
    return null;
  }

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
    console.error("Failed to extract auth session from cookies", error);
    return null;
  }
}
