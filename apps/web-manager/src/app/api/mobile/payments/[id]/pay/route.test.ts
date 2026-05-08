import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractTenantSessionFromRequestMock
} = vi.hoisted(() => ({
  extractTenantSessionFromRequestMock: vi.fn()
}));

vi.mock("../../../../../../auth/session-adapter", () => ({
  extractTenantSessionFromRequest: extractTenantSessionFromRequestMock
}));

import { POST } from "./route";

const tenantSession = {
  success: true as const,
  data: {
    userId: "tenant-auth-1",
    role: "tenant",
    organizationId: "org-1",
    capabilities: { canOwnProperties: false },
    memberships: []
  }
};

function makeRequest(paymentId: string): Request {
  return new Request(`http://localhost/api/mobile/payments/${paymentId}/pay`, { method: "POST" });
}

describe("POST /api/mobile/payments/[id]/pay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated requests", async () => {
    extractTenantSessionFromRequestMock.mockResolvedValue({
      success: false,
      code: "UNAUTHORIZED",
      error: "Authentication required"
    });

    const res = await POST(makeRequest("pay-1"), { params: Promise.resolve({ id: "pay-1" }) });

    expect(res.status).toBe(401);
  });

  it("returns 403 for authenticated tenant requests", async () => {
    extractTenantSessionFromRequestMock.mockResolvedValue(tenantSession);

    const res = await POST(makeRequest("pay-1"), { params: Promise.resolve({ id: "pay-1" }) });

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/manuellement|administration/i);
  });
});
