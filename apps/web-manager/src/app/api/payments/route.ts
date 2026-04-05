import { createPayment, listPayments } from "../../../api";
import { extractAuthSessionFromCookies } from "../../../auth/session-adapter";
import { filterPaymentsByScope, getScopedPortfolioData } from "../../../lib/operator-scope-portfolio";
import { createId, createPaymentRepo, createTeamFunctionsRepo, jsonResponse, parseJsonBody } from "../shared";

export async function POST(request: Request): Promise<Response> {
  const session = await extractAuthSessionFromCookies();
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

  if (session !== null && typeof body === "object" && body !== null) {
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

  return jsonResponse(result.status, result.body);
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const session = await extractAuthSessionFromCookies();

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
