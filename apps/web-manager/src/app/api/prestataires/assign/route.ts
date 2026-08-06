import {
  assignServiceProviderToProperty,
  unassignServiceProviderFromProperty
} from "../../../../api/prestataires/prestataires";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../../../../api/shared";
import { extractAuthSessionFromCookies } from "../../../../auth/session-adapter";
import { getScopedPortfolioData } from "../../../../lib/operator-scope-portfolio";
import {
  createId,
  createServiceProviderRepo,
  createTeamFunctionsRepo,
  jsonResponse,
  parseJsonBody
} from "../../shared";

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

  const scopedPortfolio = await getScopedPortfolioData(access.data);
  const result = await assignServiceProviderToProperty(
    { body, session: access.data, propertyIds: scopedPortfolio.propertyIds },
    {
      repository: createServiceProviderRepo(),
      teamFunctionsRepository: createTeamFunctionsRepo(),
      createId: () => createId("sp")
    }
  );

  return jsonResponse(result.status, result.body);
}

export async function DELETE(request: Request): Promise<Response> {
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

  const scopedPortfolio = await getScopedPortfolioData(access.data);
  const result = await unassignServiceProviderFromProperty(
    { body, session: access.data, propertyIds: scopedPortfolio.propertyIds },
    {
      repository: createServiceProviderRepo(),
      teamFunctionsRepository: createTeamFunctionsRepo(),
      createId: () => createId("sp")
    }
  );

  return jsonResponse(result.status, result.body);
}
