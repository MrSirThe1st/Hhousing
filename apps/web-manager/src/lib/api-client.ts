import type { ApiResult } from "@hhousing/api-contracts";

async function fetchWithAuth<T>(url: string, method: string, body?: unknown): Promise<ApiResult<T>> {
  const response = await fetch(url, {
    method,
    credentials: "include",
    headers: {
      "content-type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
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

export async function postWithAuth<T>(url: string, body: unknown): Promise<ApiResult<T>> {
  return fetchWithAuth<T>(url, "POST", body);
}

export async function postPublic<T>(url: string, body: unknown): Promise<ApiResult<T>> {
  return fetchWithAuth<T>(url, "POST", body);
}

export async function patchWithAuth<T>(url: string, body: unknown): Promise<ApiResult<T>> {
  return fetchWithAuth<T>(url, "PATCH", body);
}

export async function deleteWithAuth<T>(url: string): Promise<ApiResult<T>> {
  return fetchWithAuth<T>(url, "DELETE");
}