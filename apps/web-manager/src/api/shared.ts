import type { ApiResult, AuthSession } from "@hhousing/api-contracts";

/**
 * Require authenticated user with operator role (landlord or property_manager)
 * Returns 401 if not authenticated
 * Returns 403 if tenant (tenants use mobile app only)
 * Returns 403 if no organization context
 */
export function requireOperatorSession(session: AuthSession | null): ApiResult<AuthSession> {
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
}

/**
 * Require authenticated tenant session for mobile app APIs.
 */
export function requireTenantSession(session: AuthSession | null): ApiResult<AuthSession> {
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
}

/**
 * Require write access (landlord or property_manager can write)
 * Returns error if session fails requireOperatorSession
 */
export function requireWriteAccess(session: AuthSession | null): ApiResult<AuthSession> {
  return requireOperatorSession(session);
}

/**
 * Require read access (landlord, property_manager, or platform_admin can read; property_owner deferred)
 * Returns error if session fails requireOperatorSession
 */
export function requireReadAccess(session: AuthSession | null): ApiResult<AuthSession> {
  return requireOperatorSession(session);
}

/**
 * Helper to check if user can own properties (has capability flag)
 */
export function canOwnProperties(session: AuthSession): boolean {
  return session.capabilities?.canOwnProperties ?? false;
}

export function mapErrorCodeToHttpStatus(code: string): number {
  if (code === "UNAUTHORIZED") {
    return 401;
  }

  if (code === "FORBIDDEN") {
    return 403;
  }

  if (code === "VALIDATION_ERROR") {
    return 400;
  }

  if (code === "NOT_FOUND") {
    return 404;
  }

  return 422;
}
