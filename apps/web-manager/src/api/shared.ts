import type {
  ApiResult,
  AuthSession,
  MarketplaceAuthSession,
  MembershipAuthSession,
  PlatformAdminAuthSession
} from "@hhousing/api-contracts";

export type OperatorAuthSession = MembershipAuthSession & {
  role: "landlord" | "property_manager";
};

/**
 * Require authenticated user with operator role (landlord or property_manager)
 */
export function requireOperatorSession(session: AuthSession | null): ApiResult<OperatorAuthSession> {
  if (session === null) {
    return {
      success: false,
      code: "UNAUTHORIZED",
      error: "Authentication required"
    };
  }

  if (session.role === "tenant") {
    return {
      success: false,
      code: "FORBIDDEN",
      error: "Tenants are not permitted to access the operator system"
    };
  }

  if (session.role === "platform_admin") {
    return {
      success: false,
      code: "FORBIDDEN",
      error: "Platform admins must use the admin console"
    };
  }

  if (session.role === "marketplace_user") {
    return {
      success: false,
      code: "FORBIDDEN",
      error: "Marketplace accounts cannot access the operator system"
    };
  }

  if (session.role !== "landlord" && session.role !== "property_manager") {
    return {
      success: false,
      code: "FORBIDDEN",
      error: "Operator access required"
    };
  }

  return {
    success: true,
    data: session as OperatorAuthSession
  };
}

/**
 * Require any authenticated session that may use marketplace features.
 * Operators and marketplace seekers are both allowed (same auth.users identity).
 */
export function requireMarketplaceCapableSession(
  session: AuthSession | null
): ApiResult<AuthSession> {
  if (session === null) {
    return {
      success: false,
      code: "UNAUTHORIZED",
      error: "Authentication required"
    };
  }

  if (session.role === "tenant") {
    return {
      success: false,
      code: "FORBIDDEN",
      error: "Use the mobile app for tenant features"
    };
  }

  return {
    success: true,
    data: session
  };
}

export function requireMarketplaceSession(
  session: AuthSession | null
): ApiResult<MarketplaceAuthSession> {
  if (session === null) {
    return {
      success: false,
      code: "UNAUTHORIZED",
      error: "Authentication required"
    };
  }

  if (session.role !== "marketplace_user") {
    return {
      success: false,
      code: "FORBIDDEN",
      error: "Marketplace account required"
    };
  }

  return {
    success: true,
    data: session
  };
}

/**
 * Require authenticated platform admin session (SaaS ops, cross-org).
 */
export function requirePlatformAdminSession(
  session: AuthSession | null
): ApiResult<PlatformAdminAuthSession> {
  if (session === null) {
    return {
      success: false,
      code: "UNAUTHORIZED",
      error: "Authentication required"
    };
  }

  if (session.role !== "platform_admin") {
    return {
      success: false,
      code: "FORBIDDEN",
      error: "Platform admin access required"
    };
  }

  return {
    success: true,
    data: session
  };
}

/**
 * Require authenticated tenant session for mobile app APIs.
 */
export function requireTenantSession(
  session: AuthSession | null
): ApiResult<MembershipAuthSession & { role: "tenant" }> {
  if (session === null) {
    return {
      success: false,
      code: "UNAUTHORIZED",
      error: "Authentication required"
    };
  }

  if (session.role !== "tenant") {
    return {
      success: false,
      code: "FORBIDDEN",
      error: "This endpoint is only available to tenants"
    };
  }

  return {
    success: true,
    data: session as MembershipAuthSession & { role: "tenant" }
  };
}

export function requireWriteAccess(session: AuthSession | null): ApiResult<OperatorAuthSession> {
  return requireOperatorSession(session);
}

export function requireReadAccess(session: AuthSession | null): ApiResult<OperatorAuthSession> {
  return requireOperatorSession(session);
}

export function canOwnProperties(session: AuthSession): boolean {
  return session.capabilities?.canOwnProperties ?? false;
}

export function mapErrorCodeToHttpStatus(code: string): number {
  if (code === "UNAUTHORIZED") {
    return 401;
  }

  if (code === "FORBIDDEN" || code === "ACCOUNT_PENDING_DELETION" || code === "FEATURE_DISABLED") {
    return 403;
  }

  if (code === "VALIDATION_ERROR") {
    return 400;
  }

  if (code === "NOT_FOUND") {
    return 404;
  }

  if (code === "GONE") {
    return 410;
  }

  if (code === "CONFLICT") {
    return 409;
  }

  return 422;
}
