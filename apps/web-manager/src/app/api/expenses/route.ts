import { createExpense, listExpenses } from "../../../api";
import { extractAuthSessionFromCookies } from "../../../auth/session-adapter";
import { filterExpensesByScope, getScopedPortfolioData } from "../../../lib/operator-scope-portfolio";
import { createExpenseRepo, createId, createTeamFunctionsRepo, jsonResponse, parseJsonBody } from "../shared";

function getPayloadText(payload: Record<string, unknown>, key: string): string | null {
  const value = payload[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

export async function POST(request: Request): Promise<Response> {
  const session = await extractAuthSessionFromCookies();
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

  if (session !== null && typeof body === "object" && body !== null) {
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
  const session = await extractAuthSessionFromCookies();

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