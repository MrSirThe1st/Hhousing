import type { ApiResult, AuthSession, UserRole } from "@hhousing/api-contracts";

const ALLOWED_MANAGER_ROLES: readonly UserRole[] = ["manager", "owner", "admin"];

export function requireManagerSession(session: AuthSession | null): ApiResult<AuthSession> {
  if (session === null) {
    return {
      success: false,
      code: "UNAUTHORIZED",
      error: "Authentication required"
    };
  }

  if (!ALLOWED_MANAGER_ROLES.includes(session.role)) {
    return {
      success: false,
      code: "FORBIDDEN",
      error: "Role cannot perform this operation"
    };
  }

  if (session.organizationId === null) {
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
