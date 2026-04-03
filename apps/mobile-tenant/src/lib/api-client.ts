import type { ApiResult } from "@hhousing/api-contracts";
import { env } from "./env";
import { supabase } from "./supabase";

function getDevFallbackApiBaseUrl(baseUrl: string): string | null {
  if (!__DEV__) {
    return null;
  }

  try {
    const url = new URL(baseUrl);

    if (url.port !== "3000") {
      return null;
    }

    url.port = "3001";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function isJsonResponse(response: Response): boolean {
  const contentType = response.headers.get("content-type") ?? "";
  return contentType.includes("application/json");
}

async function parseResponse<T>(response: Response): Promise<ApiResult<T>> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as ApiResult<T>;
  }

  const responseText = await response.text();
  const responsePreview = responseText.trim().slice(0, 120);

  if (!response.ok) {
    return {
      success: false,
      code: "INTERNAL_ERROR",
      error: `Réponse API invalide (${response.status}, ${contentType || "sans content-type"})${responsePreview ? `: ${responsePreview}` : ""}`
    };
  }

  return {
    success: false,
    code: "INTERNAL_ERROR",
    error: `Réponse serveur inattendue (${contentType || "sans content-type"})${responsePreview ? `: ${responsePreview}` : ""}`
  };
}

async function request<T>(
  path: string,
  init: RequestInit,
  requiresAuth: boolean
): Promise<ApiResult<T>> {
  let authorizationHeader: string | undefined;

  if (requiresAuth) {
    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return { success: false, code: "UNAUTHORIZED", error: "Not authenticated" };
    }

    authorizationHeader = `Bearer ${session.access_token}`;
  }

  const fallbackBaseUrl = getDevFallbackApiBaseUrl(env.apiBaseUrl);

  try {
    const requestHeaders = {
      "Content-Type": "application/json",
      ...(authorizationHeader ? { Authorization: authorizationHeader } : {}),
      ...(init.headers ?? {})
    };

    let response = await fetch(`${env.apiBaseUrl}${path}`, {
      ...init,
      headers: requestHeaders
    });

    if (fallbackBaseUrl && !response.ok && !isJsonResponse(response)) {
      response = await fetch(`${fallbackBaseUrl}${path}`, {
        ...init,
        headers: requestHeaders
      });
    }

    return await parseResponse<T>(response);
  } catch {
    if (fallbackBaseUrl) {
      try {
        const response = await fetch(`${fallbackBaseUrl}${path}`, {
          ...init,
          headers: {
            "Content-Type": "application/json",
            ...(authorizationHeader ? { Authorization: authorizationHeader } : {}),
            ...(init.headers ?? {})
          }
        });

        return await parseResponse<T>(response);
      } catch {
        // Fall through to the generic network error below.
      }
    }

    return {
      success: false,
      code: "NETWORK_ERROR",
      error: "Impossible de joindre le serveur. Vérifiez l'URL API et que web-manager tourne."
    };
  }
}

export async function getWithoutAuth<T>(path: string): Promise<ApiResult<T>> {
  return request<T>(
    path,
    {
      method: "GET"
    },
    false
  );
}

export async function postWithoutAuth<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  return request<T>(
    path,
    {
      method: "POST",
      body: JSON.stringify(body)
    },
    false
  );
}

export async function getWithAuth<T>(path: string): Promise<ApiResult<T>> {
  return request<T>(
    path,
    {
      method: "GET"
    },
    true
  );
}

export async function postWithAuth<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  return request<T>(
    path,
    {
      method: "POST",
      body: JSON.stringify(body)
    },
    true
  );
}
