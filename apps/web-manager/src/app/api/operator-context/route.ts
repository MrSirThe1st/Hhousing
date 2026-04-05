import { cookies } from "next/headers";
import { extractAuthSessionFromCookies } from "../../../auth/session-adapter";
import {
  OPERATOR_SCOPE_COOKIE,
  getServerOperatorContext,
  isOperatorScope,
  isScopeAllowedForSession
} from "../../../lib/operator-context";
import type { OperatorScope } from "../../../lib/operator-context.types";
import { jsonResponse, parseJsonBody } from "../shared";

interface UpdateOperatorContextBody {
  scope: OperatorScope;
}

function parseUpdateOperatorContextBody(input: unknown): UpdateOperatorContextBody | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }

  const payload = input as Record<string, unknown>;
  return isOperatorScope(payload.scope) ? { scope: payload.scope } : null;
}

export async function GET(): Promise<Response> {
  const session = await extractAuthSessionFromCookies();
  if (session === null) {
    return jsonResponse(401, {
      success: false,
      code: "UNAUTHORIZED",
      error: "Authentication required"
    });
  }

  const context = await getServerOperatorContext(session);

  return jsonResponse(200, {
    success: true,
    data: context
  });
}

export async function POST(request: Request): Promise<Response> {
  const session = await extractAuthSessionFromCookies();
  if (session === null) {
    return jsonResponse(401, {
      success: false,
      code: "UNAUTHORIZED",
      error: "Authentication required"
    });
  }

  let body: unknown;
  try {
    body = await parseJsonBody(request);
  } catch {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: "Body must be valid JSON"
    });
  }

  const parsed = parseUpdateOperatorContextBody(body);
  if (parsed === null) {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: "scope must be 'owned' or 'managed'"
    });
  }

  if (!isScopeAllowedForSession(session, parsed.scope)) {
    return jsonResponse(403, {
      success: false,
      code: "FORBIDDEN",
      error: "Scope not allowed for current operator"
    });
  }

  const cookieStore = await cookies();
  cookieStore.set(OPERATOR_SCOPE_COOKIE, parsed.scope, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });

  const context = await getServerOperatorContext(session);

  return jsonResponse(200, {
    success: true,
    data: context
  });
}