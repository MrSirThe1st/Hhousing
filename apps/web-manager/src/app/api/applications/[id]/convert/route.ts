import { extractAuthSessionFromCookies } from "../../../../../auth/session-adapter";
import { logOperatorAuditEvent } from "../../../../../api/audit-log";
import { createId, createListingRepo, createTenantLeaseRepo, jsonResponse, parseJsonBody } from "../../../shared";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../../../../../api/shared";

function readOrganizationId(body: unknown): string | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }

  const value = (body as { organizationId?: unknown }).organizationId;
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
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

  const sessionResult = requireOperatorSession(await extractAuthSessionFromCookies());
  if (!sessionResult.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(sessionResult.code), sessionResult);
  }

  const organizationId = readOrganizationId(body);
  if (!organizationId) {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: "organizationId is required"
    });
  }

  if (organizationId !== sessionResult.data.organizationId) {
    return jsonResponse(403, {
      success: false,
      code: "FORBIDDEN",
      error: "Organization mismatch"
    });
  }

  const { id } = await context.params;
  const listingRepo = createListingRepo();
  const applicationView = await listingRepo.getApplicationById(id, organizationId);

  if (!applicationView) {
    return jsonResponse(404, {
      success: false,
      code: "NOT_FOUND",
      error: "Application not found"
    });
  }

  if (applicationView.application.status !== "approved") {
    return jsonResponse(422, {
      success: false,
      code: "VALIDATION_ERROR",
      error: "Only approved applications can be converted"
    });
  }

  if (applicationView.application.convertedTenantId) {
    return jsonResponse(422, {
      success: false,
      code: "VALIDATION_ERROR",
      error: "Application already converted"
    });
  }

  const tenantRepo = createTenantLeaseRepo();
  const tenant = await tenantRepo.createTenant({
    id: createId("ten"),
    organizationId,
    authUserId: null,
    fullName: applicationView.application.fullName,
    email: applicationView.application.email,
    phone: applicationView.application.phone,
    dateOfBirth: null,
    photoUrl: null,
    employmentStatus: applicationView.application.employmentStatus,
    jobTitle: applicationView.application.jobTitle,
    monthlyIncome: null,
    numberOfOccupants: applicationView.application.numberOfOccupants
  });

  const updatedApplication = await listingRepo.markApplicationConverted(id, organizationId, tenant.id);

  if (!updatedApplication) {
    return jsonResponse(404, {
      success: false,
      code: "NOT_FOUND",
      error: "Application not found"
    });
  }

  await logOperatorAuditEvent({
    organizationId,
    actorMemberId: sessionResult.data.memberships.find((membership) => membership.organizationId === sessionResult.data.organizationId)?.id ?? null,
    actionKey: "operations.application.converted_to_tenant",
    entityType: "application",
    entityId: updatedApplication.id,
    metadata: {
      listingId: updatedApplication.listingId,
      tenantId: tenant.id
    }
  });

  return jsonResponse(200, {
    success: true,
    data: {
      application: updatedApplication,
      tenant
    }
  });
}