import type { AuthSession } from "@hhousing/api-contracts";
import type { GetListingIntentByIdDeps } from "../../../../../api/listings/intents/get-by-id";
import type { UpdateListingIntentStatusDeps } from "../../../../../api/listings/intents/update-status";
import { getListingIntentById } from "../../../../../api/listings/intents/get-by-id";
import { updateListingIntentStatus } from "../../../../../api/listings/intents/update-status";
import { extractAuthSessionFromRequest } from "../../../../../auth/session-adapter";

export type RouteGetByIdHandler = (
  request: Request,
  context: { params: Promise<{ id: string }> }
) => Promise<Response>;
export type RoutePatchByIdHandler = (
  request: Request,
  context: { params: Promise<{ id: string }> }
) => Promise<Response>;
export type RouteSessionExtractor = (request: Request) => Promise<AuthSession | null>;

export interface CreateGetListingIntentByIdRouteDeps
  extends Partial<GetListingIntentByIdDeps> {
  extractSession?: RouteSessionExtractor;
}

export interface CreatePatchListingIntentStatusRouteDeps
  extends Partial<UpdateListingIntentStatusDeps> {
  extractSession?: RouteSessionExtractor;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json"
    }
  });
}

export function createGetListingIntentByIdRoute(
  deps?: CreateGetListingIntentByIdRouteDeps
): RouteGetByIdHandler {
  return async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
  ): Promise<Response> {
    const { id } = await context.params;

    const extractSession = deps?.extractSession ?? extractAuthSessionFromRequest;
    const session = await extractSession(request);

    const result = await getListingIntentById(
      {
        id,
        session
      },
      deps
    );

    return jsonResponse(result.status, result.body);
  };
}

export function createPatchListingIntentStatusRoute(
  deps?: CreatePatchListingIntentStatusRouteDeps
): RoutePatchByIdHandler {
  return async function PATCH(
    request: Request,
    context: { params: Promise<{ id: string }> }
  ): Promise<Response> {
    const { id } = await context.params;

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

    const status =
      typeof body === "object" &&
      body !== null &&
      "status" in body &&
      (body as { status?: unknown }).status !== undefined
        ? (body as { status: unknown }).status
        : undefined;

    if (
      status !== "draft" &&
      status !== "submitted" &&
      status !== "approved" &&
      status !== "rejected"
    ) {
      return jsonResponse(422, {
        success: false,
        code: "VALIDATION_ERROR",
        error: "status must be one of draft, submitted, approved, rejected"
      });
    }

    const extractSession = deps?.extractSession ?? extractAuthSessionFromRequest;
    const session = await extractSession(request);

    const result = await updateListingIntentStatus(
      {
        id,
        session,
        status
      },
      deps
    );

    return jsonResponse(result.status, result.body);
  };
}
