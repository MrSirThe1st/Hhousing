import type { ApiResult } from "@hhousing/api-contracts";

export interface SupabasePublicEnv {
  supabaseUrl: string;
  supabasePublishableKey: string;
}

export interface SupabasePublicEnvSource {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
}

function asRequiredText(value: string | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function readSupabasePublicEnv(
  source: SupabasePublicEnvSource
): ApiResult<SupabasePublicEnv> {
  const supabaseUrl = asRequiredText(source.NEXT_PUBLIC_SUPABASE_URL);
  const supabasePublishableKey = asRequiredText(
    source.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );

  if (supabaseUrl === null) {
    return {
      success: false,
      code: "CONFIG_ERROR",
      error: "NEXT_PUBLIC_SUPABASE_URL is required"
    };
  }

  if (supabasePublishableKey === null) {
    return {
      success: false,
      code: "CONFIG_ERROR",
      error: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required"
    };
  }

  return {
    success: true,
    data: {
      supabaseUrl,
      supabasePublishableKey
    }
  };
}
