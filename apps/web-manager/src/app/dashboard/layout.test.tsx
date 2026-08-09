import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const REDIRECT_SENTINEL = new Error("redirect");

const { getServerAuthSessionMock, getServerOperatorContextMock, redirectMock } = vi.hoisted(() => ({
  getServerAuthSessionMock: vi.fn(),
  getServerOperatorContextMock: vi.fn(),
  redirectMock: vi.fn()
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock.mockImplementation(() => {
    throw REDIRECT_SENTINEL;
  })
}));

vi.mock("../../lib/session", () => ({
  getServerAuthSession: getServerAuthSessionMock
}));

vi.mock("../../lib/operator-context", () => ({
  getServerOperatorContext: getServerOperatorContextMock,
  getOperatorScopeLabel: () => "Mon parc"
}));

vi.mock("../../lib/dashboard-request-context", () => ({
  getDashboardRequestContext: vi.fn().mockImplementation(async () => {
    const session = await getServerAuthSessionMock();
    if (!session || session.role === "tenant" || session.role === "platform_admin" || !session.organizationId) {
      return null;
    }
    return {
      session,
      access: {
        dashboard: true,
        operations: true,
        finances: true,
        services: true,
        organization: true,
        audit: true,
        billing: true,
        manageOrganization: true,
        isFoundingManager: true,
        operationsWritable: true,
        financesWritable: true,
        servicesWritable: true,
        billingWritable: true
      },
      organization: {
        id: "org_1",
        name: "Test Org",
        status: "active"
      }
    };
  })
}));

vi.mock("@hhousing/data-access", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hhousing/data-access")>();
  return {
    ...actual,
    createPlatformBillingRepositoryFromEnv: vi.fn(() => ({
      getOpenOverdueInvoiceForOrganization: vi.fn().mockResolvedValue(null)
    }))
  };
});

vi.mock("../../components/sidebar", () => ({
  default: () => "sidebar"
}));

vi.mock("../../components/bottom-navigation", () => ({
  default: () => null
}));

vi.mock("../../components/floating-action-button", () => ({
  default: () => null
}));

vi.mock("../../components/theme-toggle", () => ({
  default: () => null
}));

vi.mock("./dashboard-overdue-billing-banner", () => ({
  default: async () => null
}));

vi.mock("../api/shared", () => ({
  createRepositoryFromEnv: vi.fn(() => ({
    success: true,
    data: {
      getOrganizationById: vi.fn().mockResolvedValue({
        id: "org-1",
        name: "Test Org",
        status: "active"
      })
    }
  }))
}));

vi.mock("../../components/operator-scope-switcher", () => ({
  default: () => "switcher"
}));

import DashboardLayout from "./layout";

describe("DashboardLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated users to login", async () => {
    getServerAuthSessionMock.mockResolvedValue(null);

    await expect(DashboardLayout({ children: "content" })).rejects.toThrow(REDIRECT_SENTINEL);

    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  it("redirects tenant users to account type", async () => {
    getServerAuthSessionMock.mockResolvedValue({
      userId: "usr_1",
      role: "tenant",
      organizationId: "org_1",
      capabilities: {},
      memberships: []
    });

    await expect(DashboardLayout({ children: "content" })).rejects.toThrow(REDIRECT_SENTINEL);

    expect(redirectMock).toHaveBeenCalledWith("/account-type");
  });

  it("renders dashboard shell for operators", async () => {
    getServerAuthSessionMock.mockResolvedValue({
      userId: "usr_1",
      role: "property_manager",
      organizationId: "org_1",
      capabilities: { canOwnProperties: false },
      memberships: []
    });
    getServerOperatorContextMock.mockResolvedValue({
      experience: "entreprise"
    });

    const element = await DashboardLayout({ children: "content" }) as ReactElement<{ children: unknown }>;

    expect(redirectMock).not.toHaveBeenCalled();
    expect(element.props.children).toBeDefined();
  });

  it("renders dashboard shell for individual operators", async () => {
    getServerAuthSessionMock.mockResolvedValue({
      userId: "usr_1",
      role: "property_manager",
      organizationId: "org_1",
      capabilities: { canOwnProperties: true },
      memberships: []
    });
    getServerOperatorContextMock.mockResolvedValue({
      experience: "individual"
    });

    const element = await DashboardLayout({ children: "content" }) as ReactElement<{ children: unknown }>;

    expect(redirectMock).not.toHaveBeenCalled();
    expect(element.props.children).toBeDefined();
  });
});