import { env } from "./env";
import { supabase } from "./supabase";

// ApiResult type definition (inlined to avoid workspace dependency in EAS builds)
export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; code: string; error: string };

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, "");
}

function getFallbackApiBaseUrls(baseUrl: string): string[] {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const fallbackBaseUrls: string[] = [];

  if (__DEV__) {
    try {
      const url = new URL(normalizedBaseUrl);

      if (url.port === "3000") {
        url.port = "3001";
        fallbackBaseUrls.push(url.toString().replace(/\/$/, ""));
      }
    } catch {
      // Ignore malformed dev URL and continue with hosted fallback below.
    }
  }

  if (normalizedBaseUrl !== env.hostedApiBaseUrl) {
    fallbackBaseUrls.push(env.hostedApiBaseUrl);
  }

  return fallbackBaseUrls;
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

  const requestHeaders = {
    "Content-Type": "application/json",
    ...(authorizationHeader ? { Authorization: authorizationHeader } : {}),
    ...(init.headers ?? {})
  };

  const baseUrlsToTry = [normalizeBaseUrl(env.apiBaseUrl), ...getFallbackApiBaseUrls(env.apiBaseUrl)];
  let lastHttpError: ApiResult<T> | null = null;

  for (const baseUrl of baseUrlsToTry) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: requestHeaders
      });

      if (!response.ok && !isJsonResponse(response)) {
        const location = response.headers.get("location");
        const locationSuffix = location ? `, redirection: ${location}` : "";
        lastHttpError = {
          success: false,
          code: "INTERNAL_ERROR",
          error: `Réponse API invalide (${response.status}, ${response.headers.get("content-type") ?? "sans content-type"}) depuis ${baseUrl}${path}${locationSuffix}`
        };
        continue;
      }

      return await parseResponse<T>(response);
    } catch {
      continue;
    }
  }

  if (lastHttpError) {
    return lastHttpError;
  }

  return {
    success: false,
    code: "NETWORK_ERROR",
    error: "Impossible de joindre le serveur. Vérifiez la connexion internet ou réessayez dans quelques instants."
  };
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

export async function patchWithAuth<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  return request<T>(
    path,
    {
      method: "PATCH",
      body: JSON.stringify(body)
    },
    true
  );
}
