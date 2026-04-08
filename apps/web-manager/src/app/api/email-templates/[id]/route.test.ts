import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractAuthSessionFromCookiesMock,
  updateEmailTemplateMock,
  getEmailTemplateByIdMock,
  deleteEmailTemplateMock,
  listMemberFunctionsMock
} = vi.hoisted(() => ({
  extractAuthSessionFromCookiesMock: vi.fn(),
  updateEmailTemplateMock: vi.fn(),
  getEmailTemplateByIdMock: vi.fn(),
  deleteEmailTemplateMock: vi.fn(),
  listMemberFunctionsMock: vi.fn()
}));

vi.mock("../../../../auth/session-adapter", () => ({
  extractAuthSessionFromCookies: extractAuthSessionFromCookiesMock
}));

vi.mock("../../shared", async () => {
  const actual = await vi.importActual<typeof import("../../shared")>("../../shared");
  return {
    ...actual,
    createEmailTemplateRepo: (): {
      updateEmailTemplate: typeof updateEmailTemplateMock;
      getEmailTemplateById: typeof getEmailTemplateByIdMock;
      deleteEmailTemplate: typeof deleteEmailTemplateMock;
    } => ({
      updateEmailTemplate: updateEmailTemplateMock,
      getEmailTemplateById: getEmailTemplateByIdMock,
      deleteEmailTemplate: deleteEmailTemplateMock
    }),
    createTeamFunctionsRepo: (): {
      listMemberFunctions: typeof listMemberFunctionsMock;
    } => ({
      listMemberFunctions: listMemberFunctionsMock
    })
  };
});

import { DELETE, PATCH } from "./route";

describe("/api/email-templates/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    extractAuthSessionFromCookiesMock.mockResolvedValue({
      userId: "user-1",
      role: "property_manager",
      organizationId: "org-1",
      memberships: [
        {
          id: "membership-1",
          userId: "user-1",
          organizationId: "org-1",
          organizationName: "Org A",
          role: "property_manager",
          status: "active",
          capabilities: { canOwnProperties: false },
          createdAtIso: "2026-01-01T00:00:00.000Z"
        }
      ]
    });
    listMemberFunctionsMock.mockResolvedValue([
      {
        id: "fn-msg",
        organizationId: "org-1",
        functionCode: "LEASING_AGENT",
        displayName: "Leasing Agent",
        description: null,
        permissions: ["message_tenants"],
        createdAt: new Date("2026-01-01T00:00:00.000Z")
      }
    ]);
  });

  it("updates a custom template", async () => {
    updateEmailTemplateMock.mockResolvedValue({
      id: "tpl-1",
      organizationId: "org-1",
      name: "Updated",
      scenario: "general",
      subject: "Sujet",
      body: "Texte",
      createdByUserId: "user-1",
      updatedByUserId: "user-1",
      createdAtIso: "2026-01-01T00:00:00.000Z",
      updatedAtIso: "2026-01-01T00:00:00.000Z"
    });

    const response = await PATCH(new Request("http://localhost/api/email-templates/tpl-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        organizationId: "org-1",
        name: "Updated",
        scenario: "general",
        subject: "Sujet",
        body: "Texte"
      })
    }), { params: Promise.resolve({ id: "tpl-1" }) });

    expect(response.status).toBe(200);
  });

  it("deletes an existing custom template", async () => {
    getEmailTemplateByIdMock.mockResolvedValue({ id: "tpl-1" });

    const response = await DELETE(new Request("http://localhost/api/email-templates/tpl-1", {
      method: "DELETE"
    }), { params: Promise.resolve({ id: "tpl-1" }) });

    expect(response.status).toBe(200);
    expect(deleteEmailTemplateMock).toHaveBeenCalledWith("tpl-1", "org-1");
  });
});