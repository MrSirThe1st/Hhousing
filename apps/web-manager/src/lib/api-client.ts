import type { ApiResult } from "@hhousing/api-contracts";
import { createSupabaseBrowserClient } from "./supabase/browser";

async function getAccessToken(): Promise<string | null> {
  const supabase = createSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function postWithAuth<T>(url: string, body: unknown): Promise<ApiResult<T>> {
  const token = await getAccessToken();
  if (!token) {
    return { success: false, code: "UNAUTHORIZED", error: "Session expirée" };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });

  const responseText = await response.text();

  if (responseText.trim().length === 0) {
    return {
      success: false,
      code: "INTERNAL_ERROR",
      error: `Réponse vide du serveur (HTTP ${response.status})`
    };
  }

  try {
    return JSON.parse(responseText) as ApiResult<T>;
  } catch {
    return {
      success: false,
      code: "INTERNAL_ERROR",
      error: `Réponse invalide du serveur (HTTP ${response.status}): ${responseText.slice(0, 180)}`
    };
  }
}