import { describe, expect, it } from "vitest";
import { readSupabasePublicEnv } from "./supabase-env";

describe("readSupabasePublicEnv", () => {
  it("returns parsed public env", () => {
    const result = readSupabasePublicEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example"
    });

    expect(result).toEqual({
      success: true,
      data: {
        supabaseUrl: "https://example.supabase.co",
        supabasePublishableKey: "sb_publishable_example"
      }
    });
  });

  it("returns config error when missing", () => {
    const result = readSupabasePublicEnv({
      NEXT_PUBLIC_SUPABASE_URL: ""
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.code).toBe("CONFIG_ERROR");
  });
});
