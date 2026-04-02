import type { ApiResult } from "@hhousing/api-contracts";
import { env } from "./env";
import { supabase } from "./supabase";

async function parseResponse<T>(response: Response): Promise<ApiResult<T>> {
  return (await response.json()) as ApiResult<T>;
}

export async function getWithoutAuth<T>(path: string): Promise<ApiResult<T>> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    }
  });

  return parseResponse<T>(response);
}

export async function postWithoutAuth<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  return parseResponse<T>(response);
}

export async function getWithAuth<T>(path: string): Promise<ApiResult<T>> {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return { success: false, code: "UNAUTHORIZED", error: "Not authenticated" };
  }

  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`
    }
  });

  return parseResponse<T>(response);
}
