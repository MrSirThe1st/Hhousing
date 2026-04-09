import { parseUpdateOrganizationInput } from "@hhousing/api-contracts";
import { extractAuthSessionFromCookies } from "../../../auth/session-adapter";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../../../api/shared";
import { canEditOrganizationDetails } from "../../../lib/operator-context";
import { createRepositoryFromEnv, jsonResponse, parseJsonBody } from "../shared";

export async function GET(): Promise<Response> {
  const access = requireOperatorSession(await extractAuthSessionFromCookies());
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  if (!canEditOrganizationDetails(access.data)) {
    return jsonResponse(403, {
      success: false,
      code: "FORBIDDEN",
      error: "Organization details are not editable for this operator"
    });
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

  if (!canEditOrganizationDetails(access.data)) {
    return jsonResponse(403, {
      success: false,
      code: "FORBIDDEN",
      error: "Organization details are not editable for this operator"
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

  return jsonResponse(200, {
    success: true,
    data: { organization }
  });
}
