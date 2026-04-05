import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractAuthSessionFromCookiesMock,
  getScopedPortfolioDataMock,
  getManagerConversationDetailMock
} = vi.hoisted(() => ({
  extractAuthSessionFromCookiesMock: vi.fn(),
  getScopedPortfolioDataMock: vi.fn(),
  getManagerConversationDetailMock: vi.fn()
}));

vi.mock("../../../../../auth/session-adapter", () => ({
  extractAuthSessionFromCookies: extractAuthSessionFromCookiesMock
}));

vi.mock("../../../shared", async () => {
  const actual = await vi.importActual<typeof import("../../../shared")>("../../../shared");
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

vi.mock("../../../../../api", async () => {
  const actual = await vi.importActual<typeof import("../../../../../api")>("../../../../../api");
  return {
    ...actual,
    getManagerConversationDetail: getManagerConversationDetailMock
  };
});

vi.mock("../../../../../lib/operator-scope-portfolio", () => ({
  getScopedPortfolioData: getScopedPortfolioDataMock
}));

import { GET } from "./route";

describe("GET /api/messages/conversations/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getScopedPortfolioDataMock.mockResolvedValue({
      currentScope: "owned",
      properties: [],
      propertyIds: new Set(["prop-1"]),
      unitIds: new Set(["unit-1"]),
      leases: [],
      leaseIds: new Set(),
      tenantIds: new Set(["tenant-1"])
    });
  });

  it("returns 404 when conversation does not exist", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "landlord",
      organizationId: "org-1",
      capabilities: { canOwnProperties: true },
      memberships: []
    });

    getManagerConversationDetailMock.mockResolvedValue({
      status: 404,
      body: { success: false, code: "NOT_FOUND", error: "Conversation not found" }
    });

    const response = await GET(
      new Request("http://localhost/api/messages/conversations/conv-404"),
      { params: Promise.resolve({ id: "conv-404" }) }
    );

    expect(response.status).toBe(404);
    expect((await response.json()).code).toBe("NOT_FOUND");
  });

  it("returns conversation detail", async () => {
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "landlord",
      organizationId: "org-1",
      capabilities: { canOwnProperties: true },
      memberships: []
    });

    getManagerConversationDetailMock.mockResolvedValue({
      status: 200,
      body: {
        success: true,
        data: {
          conversation: {
            conversationId: "conv-1",
            tenantId: "tenant-1",
            tenantName: "John",
            propertyId: "prop-1",
            propertyName: "Sunset",
            unitId: "unit-1",
            unitNumber: "A12",
            leaseId: null,
            lastMessagePreview: "Hi",
            lastMessageAtIso: "2026-04-03T10:00:00.000Z",
            unreadCount: 0
          },
          messages: [],
          context: {
            tenant: { id: "tenant-1", fullName: "John", email: null, phone: null },
            unit: { id: "unit-1", unitNumber: "A12", propertyId: "prop-1", propertyName: "Sunset" },
            lease: null
          }
        }
      }
    });

    const response = await GET(
      new Request("http://localhost/api/messages/conversations/conv-1"),
      { params: Promise.resolve({ id: "conv-1" }) }
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.conversation.conversationId).toBe("conv-1");
  });
});
