import type {
  ApiResult,
  GetListingIntentByIdOutput,
  ListListingIntentsMeta,
  ListListingIntentsOutput,
  ListingIntentSort,
  ListingIntentStatus,
  ListingIntentView,
  UpdateListingIntentStatusOutput
} from "@hhousing/api-contracts";

interface ApiReadResult<T> {
  data: T | null;
  error: string | null;
}

export interface ApiAuthOptions {
  accessToken?: string;
}

export interface ReadListingIntentsQuery {
  page?: number;
  pageSize?: number;
  scope?: "mine" | "review";
  purpose?: "rent" | "sale";
  status?: ListingIntentStatus;
  locationContains?: string;
  minPriceUsd?: number;
  maxPriceUsd?: number;
  sort?: ListingIntentSort;
}

export interface ReadListingIntentsData {
  items: ListingIntentView[];
  meta: ListListingIntentsMeta;
}

function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    return "";
  }

  return process.env.WEB_USER_INTERNAL_BASE_URL ?? "http://localhost:3000";
}

function getAuthHeaders(options?: ApiAuthOptions): HeadersInit {
  const token = options?.accessToken ?? process.env.WEB_USER_DEMO_BEARER_TOKEN;
  if (!token) {
    return {};
  }

  return {
    authorization: `Bearer ${token}`
  };
}

async function fetchJson<T>(
  path: string,
  method: "GET" | "PATCH",
  options?: ApiAuthOptions,
  body?: unknown
): Promise<ApiReadResult<T>> {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    method,
    headers: {
      ...getAuthHeaders(options),
      ...(body === undefined ? {} : { "content-type": "application/json" })
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: "no-store"
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return {
      data: null,
      error: "Invalid JSON response"
    };
  }

  if (typeof payload !== "object" || payload === null || !("success" in payload)) {
    return {
      data: null,
      error: "Unexpected API response"
    };
  }

  const result = payload as ApiResult<T>;
  if (!result.success) {
    return {
      data: null,
      error: result.error
    };
  }

  return {
    data: result.data,
    error: null
  };
}

function buildQueryString(query: ReadListingIntentsQuery): string {
  const search = new URLSearchParams();

  if (typeof query.page === "number") {
    search.set("page", String(query.page));
  }

  if (typeof query.pageSize === "number") {
    search.set("pageSize", String(query.pageSize));
  }

  if (query.scope) {
    search.set("scope", query.scope);
  }

  if (query.purpose) {
    search.set("purpose", query.purpose);
  }

  if (query.status) {
    search.set("status", query.status);
  }

  if (query.locationContains && query.locationContains.trim().length > 0) {
    search.set("locationContains", query.locationContains.trim());
  }

  if (typeof query.minPriceUsd === "number") {
    search.set("minPriceUsd", String(query.minPriceUsd));
  }

  if (typeof query.maxPriceUsd === "number") {
    search.set("maxPriceUsd", String(query.maxPriceUsd));
  }

  if (query.sort) {
    search.set("sort", query.sort);
  }

  const serialized = search.toString();
  return serialized.length > 0 ? `?${serialized}` : "";
}

export async function readListingIntents(
  query: ReadListingIntentsQuery,
  options?: ApiAuthOptions
): Promise<ApiReadResult<ReadListingIntentsData>> {
  const suffix = buildQueryString(query);
  const result = await fetchJson<ListListingIntentsOutput>(
    `/api/listings/intents${suffix}`,
    "GET",
    options
  );

  if (result.data === null) {
    return {
      data: null,
      error: result.error
    };
  }

  return {
    data: {
      items: result.data.items,
      meta: result.data.meta
    },
    error: null
  };
}

export async function readListingIntentById(
  id: string,
  options?: ApiAuthOptions
): Promise<ApiReadResult<ListingIntentView>> {
  const result = await fetchJson<GetListingIntentByIdOutput>(
    `/api/listings/intents/${id}`,
    "GET",
    options
  );

  if (result.data === null) {
    return {
      data: null,
      error: result.error
    };
  }

  return {
    data: result.data.listing,
    error: null
  };
}

export async function updateListingIntentStatus(
  id: string,
  status: ListingIntentStatus,
  options?: ApiAuthOptions
): Promise<ApiReadResult<ListingIntentView>> {
  const result = await fetchJson<UpdateListingIntentStatusOutput>(
    `/api/listings/intents/${id}`,
    "PATCH",
    options,
    { status }
  );

  if (result.data === null) {
    return {
      data: null,
      error: result.error
    };
  }

  return {
    data: result.data.listing,
    error: null
  };
}
