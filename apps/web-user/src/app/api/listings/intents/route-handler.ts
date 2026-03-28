import type { AuthSession } from "@hhousing/api-contracts";
import type { GetListingIntentsDeps } from "../../../../api/listings/intents/get";
import type { PostCreateListingIntentDeps } from "../../../../api/listings/intents/post";
import { getListingIntents } from "../../../../api/listings/intents/get";
import { postCreateListingIntent } from "../../../../api/listings/intents/post";
import { extractAuthSessionFromRequest } from "../../../../auth/session-adapter";

export type RoutePostHandler = (request: Request) => Promise<Response>;
export type RouteGetHandler = (request: Request) => Promise<Response>;
export type RouteSessionExtractor = (request: Request) => Promise<AuthSession | null>;

export interface CreatePostListingIntentRouteDeps
  extends Partial<PostCreateListingIntentDeps> {
  extractSession?: RouteSessionExtractor;
}

export interface CreateGetListingIntentsRouteDeps
  extends Partial<GetListingIntentsDeps> {
  extractSession?: RouteSessionExtractor;
}

function parseOptionalNumber(value: string | null): number | undefined {
  if (value === null || value.trim().length === 0) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseOptionalText(value: string | null): string | undefined {
  if (value === null) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json"
    }
  });
}

export function createPostListingIntentRoute(
  deps?: CreatePostListingIntentRouteDeps
): RoutePostHandler {
  return async function POST(request: Request): Promise<Response> {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonResponse(400, {
        success: false,
        code: "VALIDATION_ERROR",
        error: "Request body must be valid JSON"
      });
    }

    const extractSession = deps?.extractSession ?? extractAuthSessionFromRequest;
    const session = await extractSession(request);
    const result = await postCreateListingIntent(
      {
        body,
        session
      },
      deps
    );

    return jsonResponse(result.status, result.body);
  };
}

export function createGetListingIntentsRoute(
  deps?: CreateGetListingIntentsRouteDeps
): RouteGetHandler {
  return async function GET(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const page = parseOptionalNumber(url.searchParams.get("page"));
    const pageSize = parseOptionalNumber(url.searchParams.get("pageSize"));
    const minPriceUsd = parseOptionalNumber(url.searchParams.get("minPriceUsd"));
    const maxPriceUsd = parseOptionalNumber(url.searchParams.get("maxPriceUsd"));
    const locationContains = parseOptionalText(url.searchParams.get("locationContains"));
    const purposeParam = url.searchParams.get("purpose");
    const statusParam = url.searchParams.get("status");
    const sortParam = url.searchParams.get("sort");
    const scopeParam = url.searchParams.get("scope");
    const purpose = purposeParam === "rent" || purposeParam === "sale" ? purposeParam : undefined;
    const status =
      statusParam === "draft" ||
      statusParam === "submitted" ||
      statusParam === "approved" ||
      statusParam === "rejected"
        ? statusParam
        : undefined;
    const sort =
      sortParam === "latest" || sortParam === "priceAsc" || sortParam === "priceDesc"
        ? sortParam
        : undefined;
    const scope = scopeParam === "review" ? "review" : "mine";

    const extractSession = deps?.extractSession ?? extractAuthSessionFromRequest;
    const session = await extractSession(request);
    const result = await getListingIntents(
      {
        session,
        page,
        pageSize,
        scope,
        purpose,
        status,
        locationContains,
        minPriceUsd,
        maxPriceUsd,
        sort
      },
      deps
    );

    return jsonResponse(result.status, result.body);
  };
}
