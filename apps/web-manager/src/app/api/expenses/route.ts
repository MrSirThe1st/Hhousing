import { createExpense, listExpenses } from "../../../api";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../../../api/shared";
import { extractAuthSessionFromCookies } from "../../../auth/session-adapter";
import { rejectIfIndividualExperience } from "../../../lib/entreprise-experience-guard";
import { rejectIfV1FeatureDeferred } from "../../../lib/v1-deferred-feature-guard";
import { filterExpensesByScope, getScopedPortfolioData } from "../../../lib/operator-scope-portfolio";
import { createExpenseRepo, createId, createTeamFunctionsRepo, jsonResponse, parseJsonBody } from "../shared";

function getPayloadText(payload: Record<string, unknown>, key: string): string | null {
  const value = payload[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

export async function POST(request: Request): Promise<Response> {
  const access = requireOperatorSession(await extractAuthSessionFromCookies());
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }
  const session = access.data;
  const experienceDenied = await rejectIfIndividualExperience(session);
  if (experienceDenied !== null) {
    return experienceDenied;
  }
  const deferred = rejectIfV1FeatureDeferred("expenses");
  if (deferred !== null) {
    return jsonResponse(403, deferred);
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

  if (typeof body === "object" && body !== null) {
    const payload = body as Record<string, unknown>;
    const propertyId = getPayloadText(payload, "propertyId");
    const unitId = getPayloadText(payload, "unitId");
    const scopedPortfolio = await getScopedPortfolioData(session);

    if (propertyId !== null) {
      if (!scopedPortfolio.propertyIds.has(propertyId)) {
        return jsonResponse(404, {
          success: false,
          code: "NOT_FOUND",
          error: "Property not found"
        });
      }
    }

    if (unitId !== null) {
      if (propertyId === null) {
        return jsonResponse(400, {
          success: false,
          code: "VALIDATION_ERROR",
          error: "unitId requires propertyId"
        });
      }

      const propertyRecord = scopedPortfolio.properties.find((item) => item.property.id === propertyId);
      const unitBelongsToProperty = propertyRecord?.units.some((unit) => unit.id === unitId) ?? false;
      if (!unitBelongsToProperty) {
        return jsonResponse(404, {
          success: false,
          code: "NOT_FOUND",
          error: "Unit not found"
        });
      }
    }
  }

  const result = await createExpense(
    {
      body,
      session
    },
    {
      repository: createExpenseRepo(),
      createId: () => createId("exp"),
      teamFunctionsRepository: createTeamFunctionsRepo()
    }
  );

  return jsonResponse(result.status, result.body);
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const access = requireOperatorSession(await extractAuthSessionFromCookies());
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }
  const session = access.data;
  const experienceDenied = await rejectIfIndividualExperience(session);
  if (experienceDenied !== null) {
    return experienceDenied;
  }
  const deferred = rejectIfV1FeatureDeferred("expenses");
  if (deferred !== null) {
    return jsonResponse(403, deferred);
  }

  const result = await listExpenses(
    {
      organizationId: searchParams.get("organizationId"),
      propertyId: searchParams.get("propertyId"),
      category: searchParams.get("category"),
      session
    },
    {
      repository: createExpenseRepo(),
      teamFunctionsRepository: createTeamFunctionsRepo()
    }
  );

  if (result.body.success && session !== null) {
    const scopedPortfolio = await getScopedPortfolioData(session);
    return jsonResponse(result.status, {
      success: true,
      data: {
        expenses: filterExpensesByScope(result.body.data.expenses, scopedPortfolio)
      }
    });
  }

  return jsonResponse(result.status, result.body);
}