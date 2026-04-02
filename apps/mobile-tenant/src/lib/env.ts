const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

if (!supabaseUrl) {
  throw new Error("EXPO_PUBLIC_SUPABASE_URL is required");
}

if (!supabasePublishableKey) {
  throw new Error("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required");
}

if (!apiBaseUrl) {
  throw new Error("EXPO_PUBLIC_API_BASE_URL is required");
}

export const env = {
  supabaseUrl,
  supabasePublishableKey,
  apiBaseUrl
};
