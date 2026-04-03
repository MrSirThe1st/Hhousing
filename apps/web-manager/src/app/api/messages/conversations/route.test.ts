import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractAuthSessionFromCookiesMock,
  listManagerConversationsMock,
  startManagerConversationMock
} = vi.hoisted(() => ({
  extractAuthSessionFromCookiesMock: vi.fn(),
  listManagerConversationsMock: vi.fn(),
  startManagerConversationMock: vi.fn()
}));

vi.mock("../../../../auth/session-adapter", () => ({
  extractAuthSessionFromCookies: extractAuthSessionFromCookiesMock
}));

vi.mock("../../shared", async () => {
  const actual = await vi.importActual<typeof import("../../shared")>("../../shared");
  return {
    ...actual,
    createMessageRepo: () => ({
      listManagerConversations: vi.fn(),
      getManagerConversationDetail: vi.fn(),
      startManagerConversation: vi.fn(),
      sendManagerMessage: vi.fn(),
      markManagerConversationRead: vi.fn()
    }),
    createTeamFunctionsRepo: () => ({
      listMemberFunctions: vi.fn().mockResolvedValue([])
    })
  };
});

vi.mock("../../../../api", async () => {
  const actual = await vi.importActual<typeof import("../../../../api")>("../../../../api");
  return {
    ...actual,
    listManagerConversations: listManagerConversationsMock,
    startManagerConversation: startManagerConversationMock
  };
});

import { GET, POST } from "./route";

describe("/api/messages/conversations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET passes through auth failures", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue(null);
    listManagerConversationsMock.mockResolvedValue({
      status: 401,
      body: { success: false, code: "UNAUTHORIZED", error: "Authentication required" }
    });

    const response = await GET(
      new Request("http://localhost/api/messages/conversations?propertyId=prop-1&q=john")
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      success: false,
      code: "UNAUTHORIZED",
      error: "Authentication required"
    });
  });

  it("GET returns conversations", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "landlord",
      organizationId: "org-1",
      capabilities: { canOwnProperties: true },
      memberships: []
    });

    listManagerConversationsMock.mockResolvedValue({
      status: 200,
      body: {
        success: true,
        data: {
          conversations: [
            {
              conversationId: "conv-1",
              tenantId: "tenant-1",
              tenantName: "John Doe",
              propertyId: "prop-1",
              propertyName: "Sunset",
              unitId: "unit-1",
              unitNumber: "A12",
              leaseId: "lease-1",
              lastMessagePreview: "Hello",
              lastMessageAtIso: "2026-04-03T10:00:00.000Z",
              unreadCount: 2
            }
          ]
        }
      }
    });

    const response = await GET(
      new Request("http://localhost/api/messages/conversations?propertyId=prop-1&q=john")
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.conversations).toHaveLength(1);
    expect(listManagerConversationsMock).toHaveBeenCalledWith(
      {
        session: expect.any(Object),
        propertyId: "prop-1",
        q: "john"
      },
      expect.any(Object)
    );
  });

  it("POST returns validation error for invalid json", async () => {
    const response = await POST(
      new Request("http://localhost/api/messages/conversations", {
        method: "POST",
        body: "{invalid",
        headers: { "content-type": "application/json" }
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      code: "VALIDATION_ERROR",
      error: "Body must be valid JSON"
    });
    expect(startManagerConversationMock).not.toHaveBeenCalled();
  });

  it("POST starts a conversation", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "landlord",
      organizationId: "org-1",
      capabilities: { canOwnProperties: true },
      memberships: []
    });

    startManagerConversationMock.mockResolvedValue({
      status: 201,
      body: {
        success: true,
        data: { conversationId: "conv-1" }
      }
    });

    const response = await POST(
      new Request("http://localhost/api/messages/conversations", {
        method: "POST",
        body: JSON.stringify({ tenantId: "tenant-1", body: "Bonjour" }),
        headers: { "content-type": "application/json" }
      })
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      success: true,
      data: { conversationId: "conv-1" }
    });
  });
});
