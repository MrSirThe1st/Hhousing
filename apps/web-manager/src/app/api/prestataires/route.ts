import { listPrestatairesCatalog, createOrgServiceProvider } from "../../../api/prestataires/prestataires";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../../../api/shared";
import { extractAuthSessionFromCookies } from "../../../auth/session-adapter";
import {
  createId,
  createServiceProviderRepo,
  createTeamFunctionsRepo,
  jsonResponse,
  parseJsonBody
} from "../shared";

export async function GET(): Promise<Response> {
  const access = requireOperatorSession(await extractAuthSessionFromCookies());
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const result = await listPrestatairesCatalog(access.data, {
    repository: createServiceProviderRepo()
  });

  return jsonResponse(result.status, result.body);
}

export async function POST(request: Request): Promise<Response> {
  const access = requireOperatorSession(await extractAuthSessionFromCookies());
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
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

  const result = await createOrgServiceProvider(
    { body, session: access.data },
    {
      repository: createServiceProviderRepo(),
      teamFunctionsRepository: createTeamFunctionsRepo(),
      createId: () => createId("sp")
    }
  );

  return jsonResponse(result.status, result.body);
}
