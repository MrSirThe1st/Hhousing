import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractTenantSessionFromRequestMock,
  listTenantConversationsMock
} = vi.hoisted(() => ({
  extractTenantSessionFromRequestMock: vi.fn(),
  listTenantConversationsMock: vi.fn()
}));

vi.mock("../../../../../auth/session-adapter", () => ({
  extractTenantSessionFromRequest: extractTenantSessionFromRequestMock
}));

vi.mock("../../../shared", async () => {
  const actual = await vi.importActual<typeof import("../../../shared")>("../../../shared");
  return {
    ...actual,
    createMessageRepo: () => ({
      listManagerConversations: vi.fn(),
      listTenantConversations: vi.fn(),
      getManagerConversationDetail: vi.fn(),
      getTenantConversationDetail: vi.fn(),
      startManagerConversation: vi.fn(),
      sendManagerMessage: vi.fn(),
      sendTenantMessage: vi.fn(),
      markManagerConversationRead: vi.fn()
    })
  };
});

vi.mock("../../../../../api", async () => {
  const actual = await vi.importActual<typeof import("../../../../../api")>("../../../../../api");
  return {
    ...actual,
    listTenantConversations: listTenantConversationsMock
  };
});

import { GET } from "./route";

describe("GET /api/mobile/messages/conversations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes through auth failure", async () => {
    extractTenantSessionFromRequestMock.mockResolvedValue({
      success: false,
      code: "UNAUTHORIZED",
      error: "Authentication required"
    });

    const response = await GET(new Request("http://localhost/api/mobile/messages/conversations"));

    expect(response.status).toBe(401);
    expect((await response.json()).code).toBe("UNAUTHORIZED");
  });

  it("returns tenant conversations", async () => {
    extractTenantSessionFromRequestMock.mockResolvedValue({
      success: true,
      data: {
        userId: "tenant-auth-1",
        role: "tenant",
        organizationId: "org-1",
        capabilities: { canOwnProperties: false },
        memberships: []
      }
    });

    listTenantConversationsMock.mockResolvedValue({
      status: 200,
      body: {
        success: true,
        data: {
          conversations: [
            {
              conversationId: "conv-1",
              organizationName: "Gestion Horizon",
              propertyId: "prop-1",
              propertyName: "Sunset",
              unitId: "unit-1",
              unitNumber: "A-12",
              leaseId: "lease-1",
              lastMessagePreview: "Bonjour",
              lastMessageAtIso: "2026-04-03T10:00:00.000Z"
            }
          ]
        }
      }
    });

    const response = await GET(new Request("http://localhost/api/mobile/messages/conversations"));

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.conversations).toHaveLength(1);
    expect(listTenantConversationsMock).toHaveBeenCalledWith(
      {
        session: expect.any(Object)
      },
      expect.any(Object)
    );
  });
});
