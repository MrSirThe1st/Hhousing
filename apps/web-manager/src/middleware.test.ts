import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getUserMock, fromMock, selectMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  fromMock: vi.fn(),
  selectMock: vi.fn()
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: getUserMock
    },
    from: fromMock
  }))
}));

import { middleware } from "./middleware";

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    fromMock.mockImplementation((table: string) => {
      if (table === "owner_portal_accesses") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 1 })
            })
          })
        };
      }

      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: 1 })
        })
      };
    });
  });

  it("redirects unauthenticated dashboard access to login", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const request = new NextRequest("http://localhost/dashboard");
    const response = await middleware(request);

    expect(response.headers.get("location")).toBe("http://localhost/login");
  });

  it("redirects authenticated login access to dashboard", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "usr_1" } } });

    const request = new NextRequest("http://localhost/login");
    const response = await middleware(request);

    expect(response.headers.get("location")).toBe("http://localhost/dashboard");
  });

  it("redirects authenticated owner-only login access to owner portal dashboard", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "usr_owner" } } });

    fromMock.mockImplementation((table: string) => {
      if (table === "organization_memberships") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 0 })
          })
        };
      }

      if (table === "owner_portal_accesses") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 1 })
            })
          })
        };
      }

      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: 0 })
        })
      };
    });

    const request = new NextRequest("http://localhost/login");
    const response = await middleware(request);

    expect(response.headers.get("location")).toBe("http://localhost/owner-portal/dashboard");
  });
});