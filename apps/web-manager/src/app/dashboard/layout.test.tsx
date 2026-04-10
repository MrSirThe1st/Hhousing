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

vi.mock("../../lib/sidebar-badge-counts", () => ({
  getSidebarBadgeCounts: vi.fn().mockResolvedValue({
    listings: 0,
    payments: 0,
    maintenance: 0,
    messages: 0
  })
}));

vi.mock("../../components/sidebar", () => ({
  default: () => "sidebar"
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
      experience: "manager_for_others",
      availableScopes: ["managed"],
      currentScope: "managed",
      canSwitch: false
    });

    const element = await DashboardLayout({ children: "content" }) as ReactElement<{ children: unknown }>;

    expect(redirectMock).not.toHaveBeenCalled();
    expect(element.props.children).toBeDefined();
  });
});