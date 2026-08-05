import { createPayment, listPayments } from "../../../api";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../../../api/shared";
import { extractAuthSessionFromCookies } from "../../../auth/session-adapter";
import { filterPaymentsByScope, getScopedPortfolioData } from "../../../lib/operator-scope-portfolio";
import {
  captureServerEvent,
  readPostHogDistinctId
} from "../../../lib/posthog-server";
import { createId, createPaymentRepo, createTeamFunctionsRepo, jsonResponse, parseJsonBody } from "../shared";

export async function POST(request: Request): Promise<Response> {
  const access = requireOperatorSession(await extractAuthSessionFromCookies());
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }
  const session = access.data;
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

  if (typeof body === "object" && body !== null) {
    const payload = body as Record<string, unknown>;
    const leaseId = typeof payload.leaseId === "string" ? payload.leaseId : null;

    if (leaseId !== null) {
      const scopedPortfolio = await getScopedPortfolioData(session);
      if (!scopedPortfolio.leaseIds.has(leaseId)) {
        return jsonResponse(404, {
          success: false,
          code: "NOT_FOUND",
          error: "Lease not found"
        });
      }
    }
  }

  const result = await createPayment(
    {
      body,
      session
    },
    {
      repository: createPaymentRepo(),
      createId: () => createId("pay"),
      teamFunctionsRepository: createTeamFunctionsRepo()
    }
  );

  if (result.body.success) {
    const paymentType =
      typeof body === "object" && body !== null && typeof (body as { type?: unknown }).type === "string"
        ? (body as { type: string }).type
        : undefined;

    await captureServerEvent({
      distinctId: readPostHogDistinctId(request, session.userId),
      event: "payment_recorded",
      properties: {
        organization_id: session.organizationId,
        payment_type: paymentType,
        source: "api"
      }
    });
  }

  return jsonResponse(result.status, result.body);
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const access = requireOperatorSession(await extractAuthSessionFromCookies());
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }
  const session = access.data;

  const result = await listPayments(
    {
      organizationId: searchParams.get("organizationId"),
      leaseId: searchParams.get("leaseId"),
      status: searchParams.get("status"),
      session
    },
    { repository: createPaymentRepo(), teamFunctionsRepository: createTeamFunctionsRepo() }
  );

  if (result.body.success && session !== null) {
    const scopedPortfolio = await getScopedPortfolioData(session);
    return jsonResponse(result.status, {
      success: true,
      data: {
        payments: filterPaymentsByScope(result.body.data.payments, scopedPortfolio)
      }
    });
  }

  return jsonResponse(result.status, result.body);
}
