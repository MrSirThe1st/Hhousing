import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractAuthSessionFromCookiesMock,
  sendManagerMessageMock
} = vi.hoisted(() => ({
  extractAuthSessionFromCookiesMock: vi.fn(),
  sendManagerMessageMock: vi.fn()
}));

vi.mock("../../../../../../auth/session-adapter", () => ({
  extractAuthSessionFromCookies: extractAuthSessionFromCookiesMock
}));

vi.mock("../../../../shared", async () => {
  const actual = await vi.importActual<typeof import("../../../../shared")>("../../../../shared");
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

vi.mock("../../../../../../api", async () => {
  const actual = await vi.importActual<typeof import("../../../../../../api")>("../../../../../../api");
  return {
    ...actual,
    sendManagerMessage: sendManagerMessageMock
  };
});

import { POST } from "./route";

describe("POST /api/messages/conversations/[id]/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns validation error for invalid json", async () => {
    const response = await POST(
      new Request("http://localhost/api/messages/conversations/conv-1/messages", {
        method: "POST",
        body: "{invalid",
        headers: { "content-type": "application/json" }
      }),
      { params: Promise.resolve({ id: "conv-1" }) }
    );

    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("VALIDATION_ERROR");
    expect(sendManagerMessageMock).not.toHaveBeenCalled();
  });

  it("returns auth failure", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue(null);
    sendManagerMessageMock.mockResolvedValue({
      status: 401,
      body: { success: false, code: "UNAUTHORIZED", error: "Authentication required" }
    });

    const response = await POST(
      new Request("http://localhost/api/messages/conversations/conv-1/messages", {
        method: "POST",
        body: JSON.stringify({ body: "Hello" }),
        headers: { "content-type": "application/json" }
      }),
      { params: Promise.resolve({ id: "conv-1" }) }
    );

    expect(response.status).toBe(401);
    expect((await response.json()).code).toBe("UNAUTHORIZED");
  });

  it("sends a message", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "landlord",
      organizationId: "org-1",
      capabilities: { canOwnProperties: true },
      memberships: []
    });

    sendManagerMessageMock.mockResolvedValue({
      status: 201,
      body: {
        success: true,
        data: {
          message: {
            id: "msg-1",
            organizationId: "org-1",
            conversationId: "conv-1",
            senderSide: "manager",
            senderUserId: "user-1",
            body: "Hello",
            createdAtIso: "2026-04-03T10:00:00.000Z"
          }
        }
      }
    });

    const response = await POST(
      new Request("http://localhost/api/messages/conversations/conv-1/messages", {
        method: "POST",
        body: JSON.stringify({ body: "Hello" }),
        headers: { "content-type": "application/json" }
      }),
      { params: Promise.resolve({ id: "conv-1" }) }
    );

    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.message.id).toBe("msg-1");
  });
});
