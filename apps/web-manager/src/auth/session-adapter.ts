import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import {
  createAuthRepositoryFromEnv,
  createPlatformAdminRepositoryFromEnv,
  createTenantLeaseRepositoryFromEnv
} from "@hhousing/data-access";
import type { ApiResult, AuthSession, MembershipAuthSession } from "@hhousing/api-contracts";
import { resolveAuthSessionForUserId } from "./resolve-session";

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
 * Extract auth session from Bearer token (memberships or platform admin).
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

  return resolveAuthSessionForUserId(data.user.id);
}

export async function extractTenantSessionFromRequest(
  request: Request,
  options?: { allowPendingDeletion?: boolean }
): Promise<ApiResult<MembershipAuthSession & { role: "tenant" }>> {
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
    const platformRepo = createPlatformAdminRepositoryFromEnv(process.env);
    if (await platformRepo.isUserSuspended(userId)) {
      return {
        success: false,
        code: "FORBIDDEN",
        error: "This account has been suspended"
      };
    }

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

    if (primary.role !== "tenant") {
      return {
        success: false,
        code: "FORBIDDEN",
        error: "This endpoint is only available to tenants"
      };
    }

    const session: MembershipAuthSession & { role: "tenant" } = {
      userId,
      role: "tenant",
      organizationId: primary.organizationId,
      capabilities: primary.capabilities,
      memberships
    };

    const tenantRepo = createTenantLeaseRepositoryFromEnv(process.env);
    const tenant = await tenantRepo.getTenantByAuthUserId(userId);

    if (tenant?.accountStatus === "deleted") {
      return {
        success: false,
        code: "FORBIDDEN",
        error: "This account has been deleted"
      };
    }

    const isPendingDeletion =
      tenant?.accountStatus === "pending_deletion"
      || primary.status === "inactive";

    if (isPendingDeletion && !options?.allowPendingDeletion) {
      return {
        success: false,
        code: "ACCOUNT_PENDING_DELETION",
        error: "Account deletion is pending. Cancel deletion to continue using the app."
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
 * Request-scoped so multiple handlers in one render don't re-hit Supabase Auth.
 */
export const extractAuthSessionFromCookies = cache(async function extractAuthSessionFromCookies(): Promise<AuthSession | null> {
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

  return resolveAuthSessionForUserId(user.id);
});
