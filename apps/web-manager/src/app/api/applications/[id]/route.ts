import { parseUpdateListingApplicationInput } from "@hhousing/api-contracts";
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

  return jsonResponse(200, {
    success: true,
    data: updated
  });
}