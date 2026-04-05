import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractAuthSessionFromRequestMock,
  sendTenantMessageMock
} = vi.hoisted(() => ({
  extractAuthSessionFromRequestMock: vi.fn(),
  sendTenantMessageMock: vi.fn()
}));

vi.mock("../../../../../../../auth/session-adapter", () => ({
  extractAuthSessionFromRequest: extractAuthSessionFromRequestMock
}));

vi.mock("../../../../../shared", async () => {
  const actual = await vi.importActual<typeof import("../../../../../shared")>("../../../../../shared");
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

vi.mock("../../../../../../../api", async () => {
  const actual = await vi.importActual<typeof import("../../../../../../../api")>("../../../../../../../api");
  return {
    ...actual,
    sendTenantMessage: sendTenantMessageMock
  };
});

import { POST } from "./route";

describe("POST /api/mobile/messages/conversations/[id]/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns validation error for invalid json", async () => {
    const response = await POST(
      new Request("http://localhost/api/mobile/messages/conversations/conv-1/messages", {
        method: "POST",
        body: "{invalid",
        headers: { "content-type": "application/json" }
      }),
      { params: Promise.resolve({ id: "conv-1" }) }
    );

    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("VALIDATION_ERROR");
    expect(sendTenantMessageMock).not.toHaveBeenCalled();
  });

  it("returns auth failure", async () => {
    extractAuthSessionFromRequestMock.mockResolvedValue(null);
    sendTenantMessageMock.mockResolvedValue({
      status: 401,
      body: { success: false, code: "UNAUTHORIZED", error: "Authentication required" }
    });

    const response = await POST(
      new Request("http://localhost/api/mobile/messages/conversations/conv-1/messages", {
        method: "POST",
        body: JSON.stringify({ body: "Hello" }),
        headers: { "content-type": "application/json" }
      }),
      { params: Promise.resolve({ id: "conv-1" }) }
    );

    expect(response.status).toBe(401);
    expect((await response.json()).code).toBe("UNAUTHORIZED");
  });

  it("sends tenant message", async () => {
    extractAuthSessionFromRequestMock.mockResolvedValue({
      userId: "tenant-auth-1",
      role: "tenant",
      organizationId: "org-1",
      capabilities: { canOwnProperties: false },
      memberships: []
    });

    sendTenantMessageMock.mockResolvedValue({
      status: 201,
      body: {
        success: true,
        data: {
          message: {
            id: "msg-1",
            organizationId: "org-1",
            conversationId: "conv-1",
            senderSide: "tenant",
            senderUserId: null,
            body: "Bonjour",
            createdAtIso: "2026-04-03T10:00:00.000Z"
          }
        }
      }
    });

    const response = await POST(
      new Request("http://localhost/api/mobile/messages/conversations/conv-1/messages", {
        method: "POST",
        body: JSON.stringify({ body: "Bonjour" }),
        headers: { "content-type": "application/json" }
      }),
      { params: Promise.resolve({ id: "conv-1" }) }
    );

    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.message.senderSide).toBe("tenant");
  });
});
