import { describe, expect, it } from "vitest";
import type { AuthSession } from "@hhousing/api-contracts";
import {
  requireOperatorSession,
  requirePlatformAdminSession,
  requireTenantSession
} from "./shared";

function operatorSession(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    userId: "user-1",
    role: "landlord",
    organizationId: "org-1",
    capabilities: { canOwnProperties: true },
    memberships: [],
    ...overrides
  } as AuthSession;
}

describe("requirePlatformAdminSession", () => {
  it("rejects unauthenticated", () => {
    const result = requirePlatformAdminSession(null);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("UNAUTHORIZED");
    }
  });

  it("rejects operators", () => {
    const result = requirePlatformAdminSession(operatorSession({ role: "landlord" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("FORBIDDEN");
    }
  });

  it("accepts platform_admin without organization", () => {
    const result = requirePlatformAdminSession({
      userId: "admin-1",
      role: "platform_admin",
      organizationId: null,
      capabilities: { canOwnProperties: false },
      memberships: []
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe("platform_admin");
      expect(result.data.organizationId).toBeNull();
    }
  });
});

describe("requireOperatorSession with platform_admin", () => {
  it("rejects platform_admin", () => {
    const result = requireOperatorSession({
      userId: "admin-1",
      role: "platform_admin",
      organizationId: null,
      capabilities: { canOwnProperties: false },
      memberships: []
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("FORBIDDEN");
    }
  });

  it("still accepts landlord with org", () => {
    const result = requireOperatorSession(operatorSession({ role: "landlord" }));
    expect(result.success).toBe(true);
  });
});

describe("requireTenantSession", () => {
  it("accepts tenant with organization", () => {
    const result = requireTenantSession(
      operatorSession({
        role: "tenant",
        organizationId: "org-1",
        capabilities: { canOwnProperties: false }
      })
    );
    expect(result.success).toBe(true);
  });

  it("rejects non-tenant", () => {
    const result = requireTenantSession(operatorSession({ role: "landlord" }));
    expect(result.success).toBe(false);
  });
});
