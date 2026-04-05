import type { ApiResult } from "@hhousing/api-contracts";
import { extractAuthSessionFromCookies } from "../../../../auth/session-adapter";
import { getScopedPortfolioData } from "../../../../lib/operator-scope-portfolio";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../../../../api/shared";
import { createRepositoryFromEnv, jsonResponse, parseJsonBody } from "../../shared";

type PatchUnitBody = {
  propertyId: string;
  unitNumber: string;
  monthlyRentAmount: number;
  currencyCode: string;
  status: "vacant" | "occupied" | "inactive";
};

function validatePatchUnitBody(input: unknown): ApiResult<PatchUnitBody> {
  if (typeof input !== "object" || input === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "Body must be an object"
    };
  }

  const payload = input as Record<string, unknown>;
  const propertyId = typeof payload.propertyId === "string" ? payload.propertyId.trim() : "";
  const unitNumber = typeof payload.unitNumber === "string" ? payload.unitNumber.trim() : "";
  const monthlyRentAmount = typeof payload.monthlyRentAmount === "number" ? payload.monthlyRentAmount : Number.NaN;
  const currencyCode = typeof payload.currencyCode === "string" ? payload.currencyCode.trim().toUpperCase() : "";

  if (!propertyId || !unitNumber || !currencyCode || !Number.isFinite(monthlyRentAmount) || monthlyRentAmount <= 0) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "propertyId, unitNumber, monthlyRentAmount, currencyCode are required"
    };
  }

  if (currencyCode.length !== 3) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "currencyCode must be a 3-letter ISO code"
    };
  }

  if (typeof payload.status !== "string" || !["vacant", "occupied", "inactive"].includes(payload.status)) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "status must be one of: vacant, occupied, inactive"
    };
  }

  return {
    success: true,
    data: {
      propertyId,
      unitNumber,
      monthlyRentAmount,
      currencyCode,
      status: payload.status as "vacant" | "occupied" | "inactive"
    }
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const session = await extractAuthSessionFromCookies();
  const access = requireOperatorSession(session);

  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const repositoryResult = createRepositoryFromEnv();
  if (!repositoryResult.success) {
    return jsonResponse(500, repositoryResult);
  }

  try {
    const unit = await repositoryResult.data.getUnitById(id, access.data.organizationId);

    if (!unit) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Unit not found"
      });
    }

    const scopedPortfolio = await getScopedPortfolioData(access.data);
    if (!scopedPortfolio.unitIds.has(unit.id)) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Unit not found"
      });
    }

    return jsonResponse(200, {
      success: true,
      data: unit
    });
  } catch (error) {
    console.error("Failed to fetch unit", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to fetch unit"
    });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const session = await extractAuthSessionFromCookies();
  const access = requireOperatorSession(session);

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

  const repositoryResult = createRepositoryFromEnv();
  if (!repositoryResult.success) {
    return jsonResponse(500, repositoryResult);
  }

  const parsed = validatePatchUnitBody(body);
  if (!parsed.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(parsed.code), parsed);
  }

  try {
    const existingUnit = await repositoryResult.data.getUnitById(id, access.data.organizationId);
    if (!existingUnit) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Unit not found"
      });
    }

    const scopedPortfolio = await getScopedPortfolioData(access.data);
    if (!scopedPortfolio.unitIds.has(existingUnit.id) || !scopedPortfolio.propertyIds.has(parsed.data.propertyId)) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Unit not found"
      });
    }

    const unit = await repositoryResult.data.updateUnit({
      id,
      organizationId: access.data.organizationId,
      propertyId: parsed.data.propertyId,
      unitNumber: parsed.data.unitNumber,
      monthlyRentAmount: parsed.data.monthlyRentAmount,
      currencyCode: parsed.data.currencyCode,
      status: parsed.data.status
    });

    if (!unit) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Unit not found"
      });
    }

    return jsonResponse(200, {
      success: true,
      data: unit
    });
  } catch (error) {
    console.error("Failed to update unit", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to update unit"
    });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const session = await extractAuthSessionFromCookies();
  const access = requireOperatorSession(session);

  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const repositoryResult = createRepositoryFromEnv();
  if (!repositoryResult.success) {
    return jsonResponse(500, repositoryResult);
  }

  try {
    const unit = await repositoryResult.data.getUnitById(id, access.data.organizationId);
    if (!unit) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Unit not found"
      });
    }

    const scopedPortfolio = await getScopedPortfolioData(access.data);
    if (!scopedPortfolio.unitIds.has(unit.id)) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Unit not found"
      });
    }

    const deleted = await repositoryResult.data.deleteUnit(id, access.data.organizationId);

    if (!deleted) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Unit not found"
      });
    }

    return jsonResponse(200, {
      success: true,
      data: { deleted: true }
    });
  } catch (error) {
    console.error("Failed to delete unit", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to delete unit"
    });
  }
}
