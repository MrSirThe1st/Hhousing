import i18n from "@/i18n";
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
  const contentTypeLabel = contentType || i18n.t("errors.withoutContentType");
  const previewSuffix = responsePreview ? `: ${responsePreview}` : "";

  if (!response.ok) {
    return {
      success: false,
      code: "INTERNAL_ERROR",
      error: i18n.t("errors.apiInvalidResponse", {
        status: response.status,
        contentType: contentTypeLabel,
        preview: previewSuffix
      })
    };
  }

  return {
    success: false,
    code: "INTERNAL_ERROR",
    error: i18n.t("errors.apiUnexpectedResponse", {
      contentType: contentTypeLabel,
      preview: previewSuffix
    })
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
      return { success: false, code: "UNAUTHORIZED", error: i18n.t("errors.notAuthenticated") };
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
        const locationSuffix = location
          ? i18n.t("errors.redirectPrefix", { location })
          : "";
        lastHttpError = {
          success: false,
          code: "INTERNAL_ERROR",
          error: i18n.t("errors.apiInvalidFrom", {
            status: response.status,
            contentType: response.headers.get("content-type") ?? i18n.t("errors.withoutContentType"),
            url: `${baseUrl}${path}`,
            location: locationSuffix
          })
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
    error: i18n.t("errors.networkUnreachable")
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
