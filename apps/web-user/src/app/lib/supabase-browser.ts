"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export const SUPABASE_BROWSER_ENV_ERROR =
  "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY";

function readSupabaseBrowserConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return null;
  }

  return { url, key };
}

export function getSupabaseBrowserClientOrNull(): SupabaseClient | null {
  if (client !== null) {
    return client;
  }

  const config = readSupabaseBrowserConfig();
  if (config === null) {
    return null;
  }

  client = createClient(config.url, config.key);
  return client;
}

export function getSupabaseBrowserClient(): SupabaseClient {
  const supabase = getSupabaseBrowserClientOrNull();
  if (supabase === null) {
    throw new Error(SUPABASE_BROWSER_ENV_ERROR);
  }

  return supabase;
}
