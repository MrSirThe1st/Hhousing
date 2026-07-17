import { describe, expect, it, vi } from "vitest";
import { loginTenantWithPhonePassword } from "./tenant-phone-login";

describe("loginTenantWithPhonePassword", () => {
  it("rejects invalid body", async () => {
    const result = await loginTenantWithPhonePassword(null, {
      tenantRepository: {
        findTenantByNormalizedPhone: vi.fn()
      } as never,
      supabaseUrl: "https://example.supabase.co",
      supabaseAnonKey: "anon"
    });

    expect(result.status).toBe(400);
    expect(result.body.success).toBe(false);
  });

  it("returns unauthorized when tenant is missing", async () => {
    const result = await loginTenantWithPhonePassword(
      { phone: "+243990000000", password: "password1" },
      {
        tenantRepository: {
          findTenantByNormalizedPhone: vi.fn().mockResolvedValue(null)
        } as never,
        supabaseUrl: "https://example.supabase.co",
        supabaseAnonKey: "anon"
      }
    );

    expect(result.status).toBe(401);
    expect(result.body.success).toBe(false);
  });

  it("returns session tokens for a valid phone + password", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "access",
          refresh_token: "refresh",
          expires_in: 3600
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await loginTenantWithPhonePassword(
      { phone: "0990000000", password: "password1" },
      {
        tenantRepository: {
          findTenantByNormalizedPhone: vi.fn().mockResolvedValue({
            id: "tenant-1",
            organizationId: "org-1",
            authUserId: "user-1",
            email: "tenant@example.com"
          })
        } as never,
        supabaseUrl: "https://example.supabase.co",
        supabaseAnonKey: "anon"
      }
    );

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      success: true,
      data: {
        accessToken: "access",
        refreshToken: "refresh",
        expiresIn: 3600,
        tenantId: "tenant-1",
        organizationId: "org-1"
      }
    });

    vi.unstubAllGlobals();
  });
});
