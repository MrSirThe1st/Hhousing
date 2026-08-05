import { deleteExpense, updateExpense } from "../../../../api";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../../../../api/shared";
import { extractAuthSessionFromCookies } from "../../../../auth/session-adapter";
import { getScopedPortfolioData } from "../../../../lib/operator-scope-portfolio";
import { createExpenseRepo, createTeamFunctionsRepo, jsonResponse, parseJsonBody } from "../../shared";

function isExpenseInScope(
  propertyId: string | null,
  unitId: string | null,
  propertyIds: Set<string>,
  unitIds: Set<string>
): boolean {
  if (propertyId !== null && !propertyIds.has(propertyId)) {
    return false;
  }

  if (unitId !== null && !unitIds.has(unitId)) {
    return false;
  }

  return true;
}

function getPayloadText(payload: Record<string, unknown>, key: string): string | null {
  const value = payload[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const access = requireOperatorSession(await extractAuthSessionFromCookies());
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }
  const session = access.data;
  const repository = createExpenseRepo();

  const existingExpense = await repository.getExpenseById(id, session.organizationId);
  if (!existingExpense) {
    return jsonResponse(404, {
      success: false,
      code: "NOT_FOUND",
      error: "Expense not found"
    });
  }

  const scopedPortfolio = await getScopedPortfolioData(session);
  if (!isExpenseInScope(existingExpense.propertyId, existingExpense.unitId, scopedPortfolio.propertyIds, scopedPortfolio.unitIds)) {
    return jsonResponse(404, {
      success: false,
      code: "NOT_FOUND",
      error: "Expense not found"
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

  if (typeof body === "object" && body !== null) {
    const payload = body as Record<string, unknown>;
    const propertyId = getPayloadText(payload, "propertyId");
    const unitId = getPayloadText(payload, "unitId");

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

  const result = await updateExpense(
    {
      expenseId: id,
      body,
      session
    },
    {
      repository,
      teamFunctionsRepository: createTeamFunctionsRepo()
    }
  );

  return jsonResponse(result.status, result.body);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const access = requireOperatorSession(await extractAuthSessionFromCookies());
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }
  const session = access.data;
  const repository = createExpenseRepo();

  const existingExpense = await repository.getExpenseById(id, session.organizationId);
  if (!existingExpense) {
    return jsonResponse(404, {
      success: false,
      code: "NOT_FOUND",
      error: "Expense not found"
    });
  }

  const scopedPortfolio = await getScopedPortfolioData(session);
  if (!isExpenseInScope(existingExpense.propertyId, existingExpense.unitId, scopedPortfolio.propertyIds, scopedPortfolio.unitIds)) {
    return jsonResponse(404, {
      success: false,
      code: "NOT_FOUND",
      error: "Expense not found"
    });
  }

  const result = await deleteExpense(
    {
      expenseId: id,
      session
    },
    {
      repository,
      teamFunctionsRepository: createTeamFunctionsRepo()
    }
  );

  return jsonResponse(result.status, result.body);
}
