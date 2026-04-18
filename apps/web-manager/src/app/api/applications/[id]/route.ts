import { parseUpdateListingApplicationInput } from "@hhousing/api-contracts";
import { logOperatorAuditEvent } from "../../../../api/audit-log";
import { extractAuthSessionFromCookies } from "../../../../auth/session-adapter";
import { createListingRepo, jsonResponse, parseJsonBody } from "../../shared";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../../../../api/shared";

export async function PATCH(
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

  const parsed = parseUpdateListingApplicationInput(body);
  if (!parsed.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(parsed.code), parsed);
  }

  if (parsed.data.organizationId !== sessionResult.data.organizationId) {
    return jsonResponse(403, {
      success: false,
      code: "FORBIDDEN",
      error: "Organization mismatch"
    });
  }

  const { id } = await context.params;
  const listingRepo = createListingRepo();
  const existing = await listingRepo.getApplicationById(id, parsed.data.organizationId);

  if (!existing) {
    return jsonResponse(404, {
      success: false,
      code: "NOT_FOUND",
      error: "Application not found"
    });
  }

  const updated = await listingRepo.updateApplicationStatus({
    applicationId: id,
    organizationId: parsed.data.organizationId,
    status: parsed.data.status,
    screeningNotes: parsed.data.screeningNotes ?? null,
    requestedInfoMessage: parsed.data.requestedInfoMessage ?? null,
    reviewedByUserId: sessionResult.data.userId,
    reviewedAtIso: new Date().toISOString()
  });

  if (!updated) {
    return jsonResponse(404, {
      success: false,
      code: "NOT_FOUND",
      error: "Application not found"
    });
  }

  await logOperatorAuditEvent({
    organizationId: sessionResult.data.organizationId,
    actorMemberId: sessionResult.data.memberships.find((membership) => membership.organizationId === sessionResult.data.organizationId)?.id ?? null,
    actionKey: "operations.application.reviewed",
    entityType: "application",
    entityId: updated.id,
    metadata: {
      listingId: updated.listingId,
      status: updated.status
    }
  });

  return jsonResponse(200, {
    success: true,
    data: updated
  });
}