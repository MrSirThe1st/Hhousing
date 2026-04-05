import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractAuthSessionFromRequestMock,
  getTenantConversationDetailMock
} = vi.hoisted(() => ({
  extractAuthSessionFromRequestMock: vi.fn(),
  getTenantConversationDetailMock: vi.fn()
}));

vi.mock("../../../../../../auth/session-adapter", () => ({
  extractAuthSessionFromRequest: extractAuthSessionFromRequestMock
}));

vi.mock("../../../../shared", async () => {
  const actual = await vi.importActual<typeof import("../../../../shared")>("../../../../shared");
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

vi.mock("../../../../../../api", async () => {
  const actual = await vi.importActual<typeof import("../../../../../../api")>("../../../../../../api");
  return {
    ...actual,
    getTenantConversationDetail: getTenantConversationDetailMock
  };
});

import { GET } from "./route";

describe("GET /api/mobile/messages/conversations/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns not found", async () => {
    extractAuthSessionFromRequestMock.mockResolvedValue({
      userId: "tenant-auth-1",
      role: "tenant",
      organizationId: "org-1",
      capabilities: { canOwnProperties: false },
      memberships: []
    });

    getTenantConversationDetailMock.mockResolvedValue({
      status: 404,
      body: { success: false, code: "NOT_FOUND", error: "Conversation not found" }
    });

    const response = await GET(
      new Request("http://localhost/api/mobile/messages/conversations/conv-x"),
      { params: Promise.resolve({ id: "conv-x" }) }
    );

    expect(response.status).toBe(404);
    expect((await response.json()).code).toBe("NOT_FOUND");
  });

  it("returns conversation detail", async () => {
    extractAuthSessionFromRequestMock.mockResolvedValue({
      userId: "tenant-auth-1",
      role: "tenant",
      organizationId: "org-1",
      capabilities: { canOwnProperties: false },
      memberships: []
    });

    getTenantConversationDetailMock.mockResolvedValue({
      status: 200,
      body: {
        success: true,
        data: {
          conversation: {
            conversationId: "conv-1",
            organizationName: "Gestion Horizon",
            propertyId: "prop-1",
            propertyName: "Sunset",
            unitId: "unit-1",
            unitNumber: "A-12",
            leaseId: "lease-1",
            lastMessagePreview: "Bonjour",
            lastMessageAtIso: "2026-04-03T10:00:00.000Z"
          },
          messages: [],
          context: {
            unit: {
              id: "unit-1",
              unitNumber: "A-12",
              propertyId: "prop-1",
              propertyName: "Sunset"
            },
            lease: null
          }
        }
      }
    });

    const response = await GET(
      new Request("http://localhost/api/mobile/messages/conversations/conv-1"),
      { params: Promise.resolve({ id: "conv-1" }) }
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.conversation.conversationId).toBe("conv-1");
  });
});
