import { describe, expect, it, vi } from "vitest";
import { isDeliverableTenantEmail, requestTenantPasswordReset } from "./tenant-password-reset";

describe("isDeliverableTenantEmail", () => {
  it("rejects synthetic phone emails", () => {
    expect(isDeliverableTenantEmail("243990000000@phone.tenant.harakaproperty.local")).toBe(false);
  });

  it("accepts real emails", () => {
    expect(isDeliverableTenantEmail("tenant@example.com")).toBe(true);
  });
});

describe("requestTenantPasswordReset", () => {
  it("always returns generic success for unknown phone", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestTenantPasswordReset(
      { phone: "+243990000000" },
      {
        tenantRepository: {
          findTenantByNormalizedPhone: vi.fn().mockResolvedValue(null),
          findTenantByEmail: vi.fn()
        } as never,
        supabaseUrl: "https://example.supabase.co",
        supabaseAnonKey: "anon",
        redirectTo: "https://example.com/auth/callback?next=%2Ftenant%2Freset-password"
      }
    );

    expect(result.status).toBe(200);
    expect(result.body.success).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("sends recover email when tenant has a real email", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestTenantPasswordReset(
      { phone: "+243990000000" },
      {
        tenantRepository: {
          findTenantByNormalizedPhone: vi.fn().mockResolvedValue({
            id: "tenant-1",
            authUserId: "user-1",
            email: "tenant@example.com"
          }),
          findTenantByEmail: vi.fn()
        } as never,
        supabaseUrl: "https://example.supabase.co",
        supabaseAnonKey: "anon",
        redirectTo: "https://example.com/auth/callback?next=%2Ftenant%2Freset-password"
      }
    );

    expect(result.status).toBe(200);
    expect(result.body.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).toContain("/auth/v1/recover");
    expect(calledUrl).toContain("redirect_to=");
    vi.unstubAllGlobals();
  });

  it("does not send email for synthetic addresses but still succeeds", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestTenantPasswordReset(
      { email: "missing@example.com" },
      {
        tenantRepository: {
          findTenantByNormalizedPhone: vi.fn(),
          findTenantByEmail: vi.fn().mockResolvedValue({
            id: "tenant-1",
            authUserId: "user-1",
            email: "243990000000@phone.tenant.harakaproperty.local"
          })
        } as never,
        supabaseUrl: "https://example.supabase.co",
        supabaseAnonKey: "anon",
        redirectTo: "https://example.com/auth/callback?next=%2Ftenant%2Freset-password"
      }
    );

    expect(result.status).toBe(200);
    expect(result.body.success).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
