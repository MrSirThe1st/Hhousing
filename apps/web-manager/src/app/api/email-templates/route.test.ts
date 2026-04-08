import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractAuthSessionFromCookiesMock,
  listEmailTemplatesMock,
  createEmailTemplateMock,
  listMemberFunctionsMock
} = vi.hoisted(() => ({
  extractAuthSessionFromCookiesMock: vi.fn(),
  listEmailTemplatesMock: vi.fn(),
  createEmailTemplateMock: vi.fn(),
  listMemberFunctionsMock: vi.fn()
}));

vi.mock("../../../auth/session-adapter", () => ({
  extractAuthSessionFromCookies: extractAuthSessionFromCookiesMock
}));

vi.mock("../shared", async () => {
  const actual = await vi.importActual<typeof import("../shared")>("../shared");
  return {
    ...actual,
    createEmailTemplateRepo: (): {
      listEmailTemplates: typeof listEmailTemplatesMock;
      createEmailTemplate: typeof createEmailTemplateMock;
    } => ({
      listEmailTemplates: listEmailTemplatesMock,
      createEmailTemplate: createEmailTemplateMock
    }),
    createTeamFunctionsRepo: (): {
      listMemberFunctions: typeof listMemberFunctionsMock;
    } => ({
      listMemberFunctions: listMemberFunctionsMock
    })
  };
});

import { GET, POST } from "./route";

describe("/api/email-templates", () => {
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

  it("lists builtin and custom templates", async () => {
    listEmailTemplatesMock.mockResolvedValue([
      {
        id: "tpl-1",
        organizationId: "org-1",
        name: "Custom Welcome",
        scenario: "welcome_letter",
        subject: "Bonjour",
        body: "Texte",
        createdByUserId: "user-1",
        updatedByUserId: "user-1",
        createdAtIso: "2026-01-01T00:00:00.000Z",
        updatedAtIso: "2026-01-01T00:00:00.000Z"
      }
    ]);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.templates.some((template: { id: string }) => template.id === "tpl-1")).toBe(true);
    expect(json.data.templates.some((template: { id: string }) => template.id === "builtin:lease_draft")).toBe(true);
  });

  it("creates a custom template", async () => {
    createEmailTemplateMock.mockResolvedValue({
      id: "tpl-1",
      organizationId: "org-1",
      name: "Custom Welcome",
      scenario: "welcome_letter",
      subject: "Bonjour",
      body: "Texte",
      createdByUserId: "user-1",
      updatedByUserId: "user-1",
      createdAtIso: "2026-01-01T00:00:00.000Z",
      updatedAtIso: "2026-01-01T00:00:00.000Z"
    });

    const response = await POST(new Request("http://localhost/api/email-templates", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        organizationId: "org-1",
        name: "Custom Welcome",
        scenario: "welcome_letter",
        subject: "Bonjour",
        body: "Texte"
      })
    }));

    expect(response.status).toBe(201);
    expect(createEmailTemplateMock).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid template payload", async () => {
    const response = await POST(new Request("http://localhost/api/email-templates", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ organizationId: "org-1", name: "", subject: "", body: "" })
    }));

    expect(response.status).toBe(400);
  });
});