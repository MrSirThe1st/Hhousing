import { extractAuthSessionFromCookies } from "../../../../auth/session-adapter";
import { createRepositoryFromEnv, jsonResponse, parseJsonBody } from "../../shared";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const session = await extractAuthSessionFromCookies();

  if (!session) {
    return jsonResponse(401, {
      success: false,
      code: "UNAUTHORIZED",
      error: "Authentication required"
    });
  }

  const repositoryResult = createRepositoryFromEnv();
  if (!repositoryResult.success) {
    return jsonResponse(500, repositoryResult);
  }

  try {
    const unit = await repositoryResult.data.getUnitById(id, session.organizationId);

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

  if (!session) {
    return jsonResponse(401, {
      success: false,
      code: "UNAUTHORIZED",
      error: "Authentication required"
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

  const repositoryResult = createRepositoryFromEnv();
  if (!repositoryResult.success) {
    return jsonResponse(500, repositoryResult);
  }

  const payload = body as Record<string, unknown>;
  const propertyId = typeof payload.propertyId === "string" ? payload.propertyId.trim() : "";
  const unitNumber = typeof payload.unitNumber === "string" ? payload.unitNumber.trim() : "";
  const monthlyRentAmount = typeof payload.monthlyRentAmount === "number" ? payload.monthlyRentAmount : 0;
  const currencyCode = typeof payload.currencyCode === "string" ? payload.currencyCode.trim() : "";
  const status = typeof payload.status === "string" && ["vacant", "occupied", "inactive"].includes(payload.status)
    ? payload.status as "vacant" | "occupied" | "inactive"
    : "vacant";

  if (!propertyId || !unitNumber || !currencyCode || monthlyRentAmount <= 0) {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: "propertyId, unitNumber, monthlyRentAmount, currencyCode are required"
    });
  }

  try {
    const unit = await repositoryResult.data.updateUnit({
      id,
      organizationId: session.organizationId,
      propertyId,
      unitNumber,
      monthlyRentAmount,
      currencyCode,
      status
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

  if (!session) {
    return jsonResponse(401, {
      success: false,
      code: "UNAUTHORIZED",
      error: "Authentication required"
    });
  }

  const repositoryResult = createRepositoryFromEnv();
  if (!repositoryResult.success) {
    return jsonResponse(500, repositoryResult);
  }

  try {
    const deleted = await repositoryResult.data.deleteUnit(id, session.organizationId);

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
