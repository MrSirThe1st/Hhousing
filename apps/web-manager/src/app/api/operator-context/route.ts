import { parseUpdatePlatformExperienceInput } from "@hhousing/api-contracts";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../../../api/shared";
import { extractAuthSessionFromCookies } from "../../../auth/session-adapter";
import { getServerOperatorContext, isAccountOwner } from "../../../lib/operator-context";
import { createRepositoryFromEnv, jsonResponse, parseJsonBody } from "../shared";

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

export async function PATCH(request: Request): Promise<Response> {
  const access = requireOperatorSession(await extractAuthSessionFromCookies());
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const ownerError = await isAccountOwner(access.data)
    ? null
    : jsonResponse(403, {
      success: false,
      code: "FORBIDDEN",
      error: "Only the account owner can change platform experience"
    });
  if (ownerError) {
    return ownerError;
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

  const parsed = parseUpdatePlatformExperienceInput(body);
  if (!parsed.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(parsed.code), parsed);
  }

  const repositoryResult = createRepositoryFromEnv();
  if (!repositoryResult.success) {
    return jsonResponse(500, repositoryResult);
  }

  const organization = await repositoryResult.data.updateOrganizationPlatformExperience({
    id: access.data.organizationId,
    platformExperience: parsed.data.platformExperience
  });

  if (!organization) {
    return jsonResponse(404, {
      success: false,
      code: "NOT_FOUND",
      error: "Organization not found"
    });
  }

  const context = await getServerOperatorContext(access.data);

  return jsonResponse(200, {
    success: true,
    data: context
  });
}

export async function POST(request: Request): Promise<Response> {
  return PATCH(request);
}
