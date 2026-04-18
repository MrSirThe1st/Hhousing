import { parseUpdateOrganizationInput } from "@hhousing/api-contracts";
import { extractAuthSessionFromCookies } from "../../../auth/session-adapter";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../../../api/shared";
import { logOperatorAuditEvent } from "../../../api/audit-log";
import { createAuthRepo, createRepositoryFromEnv, jsonResponse, parseJsonBody } from "../shared";

export async function GET(): Promise<Response> {
  const access = requireOperatorSession(await extractAuthSessionFromCookies());
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const repositoryResult = createRepositoryFromEnv();
  if (!repositoryResult.success) {
    return jsonResponse(500, repositoryResult);
  }

  const organization = await repositoryResult.data.getOrganizationById(access.data.organizationId);
  if (!organization) {
    return jsonResponse(404, {
      success: false,
      code: "NOT_FOUND",
      error: "Organization not found"
    });
  }

  return jsonResponse(200, {
    success: true,
    data: { organization }
  });
}

export async function PATCH(request: Request): Promise<Response> {
  const access = requireOperatorSession(await extractAuthSessionFromCookies());
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const currentMembership = access.data.memberships.find(
    (membership) => membership.organizationId === access.data.organizationId
  );
  const operatorMemberships = (await createAuthRepo().listMembershipsByOrganization(access.data.organizationId))
    .filter((membership) => membership.role === "landlord" || membership.role === "property_manager")
    .sort(
      (left, right) =>
        new Date(left.createdAtIso).getTime() - new Date(right.createdAtIso).getTime()
    );
  const accountOwnerMembership = operatorMemberships[0] ?? null;

  if (!currentMembership || accountOwnerMembership?.id !== currentMembership.id) {
    return jsonResponse(403, {
      success: false,
      code: "FORBIDDEN",
      error: "Only the account owner can edit organization details"
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

  const parsed = parseUpdateOrganizationInput(body);
  if (!parsed.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(parsed.code), parsed);
  }

  const repositoryResult = createRepositoryFromEnv();
  if (!repositoryResult.success) {
    return jsonResponse(500, repositoryResult);
  }

  const organization = await repositoryResult.data.updateOrganization({
    id: access.data.organizationId,
    name: parsed.data.name,
    logoUrl: parsed.data.logoUrl ?? null,
    contactEmail: parsed.data.contactEmail ?? null,
    contactPhone: parsed.data.contactPhone ?? null,
    contactWhatsapp: parsed.data.contactWhatsapp ?? null,
    websiteUrl: parsed.data.websiteUrl ?? null,
    address: parsed.data.address ?? null,
    emailSignature: parsed.data.emailSignature ?? null
  });

  if (!organization) {
    return jsonResponse(404, {
      success: false,
      code: "NOT_FOUND",
      error: "Organization not found"
    });
  }

  await logOperatorAuditEvent({
    organizationId: access.data.organizationId,
    actorMemberId: access.data.memberships.find((membership) => membership.organizationId === access.data.organizationId)?.id ?? null,
    actionKey: "operations.organization.settings_updated",
    entityType: "organization",
    entityId: organization.id,
    metadata: {}
  });

  return jsonResponse(200, {
    success: true,
    data: { organization }
  });
}
