import { createLease, listLeases } from "../../../api";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../../../api/shared";
import { extractAuthSessionFromCookies } from "../../../auth/session-adapter";
import { createTenantInvitationNotificationDepsFromEnv } from "../../../lib/notifications/tenant-invitation-notifiers";
import { filterLeasesByScope, getScopedPortfolioData } from "../../../lib/operator-scope-portfolio";
import {
  captureServerEvent,
  captureServerException,
  readPostHogDistinctId
} from "../../../lib/posthog-server";
import { createId, createPaymentRepo, createRepositoryFromEnv, createTeamFunctionsRepo, createTenantLeaseRepo, jsonResponse, parseJsonBody } from "../shared";

export async function POST(request: Request): Promise<Response> {
  let distinctId: string | null = null;
  try {
    const access = requireOperatorSession(await extractAuthSessionFromCookies());
    if (!access.success) {
      return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
    }
    const session = access.data;
    distinctId = readPostHogDistinctId(request, session.userId);
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
      const unitId = typeof payload.unitId === "string" ? payload.unitId : null;

      if (unitId !== null) {
        const scopedPortfolio = await getScopedPortfolioData(session);
        if (!scopedPortfolio.unitIds.has(unitId)) {
          return jsonResponse(404, {
            success: false,
            code: "NOT_FOUND",
            error: "Unit not found"
          });
        }
      }
    }

    const organizationRepositoryResult = createRepositoryFromEnv();
    const inviteLinkBaseUrl =
      process.env.MOBILE_TENANT_INVITE_URL_BASE?.trim()
      || `${(process.env.NEXT_PUBLIC_APP_URL ?? "https://www.harakaproperty.com").replace(/\/$/, "")}/invite`;
    const notificationDeps = createTenantInvitationNotificationDepsFromEnv();

    const result = await createLease(
      {
        body,
        session
      },
      {
        repository: createTenantLeaseRepo(),
        paymentRepository: createPaymentRepo(),
        teamFunctionsRepository: createTeamFunctionsRepo(),
        createId: () => createId("lease"),
        createPaymentId: () => createId("pay"),
        invitationDeps: {
          createInvitationId: () => createId("tin"),
          inviteLinkBaseUrl,
          organizationRepository: organizationRepositoryResult.success ? organizationRepositoryResult.data : undefined,
          ...notificationDeps
        }
      }
    );

    if (result.body.success) {
      await captureServerEvent({
        distinctId,
        event: "lease_created",
        properties: {
          organization_id: session.organizationId,
          source: "api"
        }
      });
    }

    return jsonResponse(result.status, result.body);
  } catch (error) {
    console.error("Unhandled error in POST /api/leases", error);
    if (distinctId !== null) {
      await captureServerException(error, distinctId);
    }
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: error instanceof Error ? error.message : "Failed to create lease"
    });
  }
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId");
  const access = requireOperatorSession(await extractAuthSessionFromCookies());
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }
  const session = access.data;

  const result = await listLeases(
    {
      organizationId,
      session
    },
    {
      repository: createTenantLeaseRepo(),
      teamFunctionsRepository: createTeamFunctionsRepo()
    }
  );

  if (result.body.success && session !== null) {
    const scopedPortfolio = await getScopedPortfolioData(session);
    return jsonResponse(result.status, {
      success: true,
      data: {
        leases: filterLeasesByScope(result.body.data.leases, scopedPortfolio)
      }
    });
  }

  return jsonResponse(result.status, result.body);
}
