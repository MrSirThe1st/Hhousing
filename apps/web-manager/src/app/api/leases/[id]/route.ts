import { Permission, type ApiResult } from "@hhousing/api-contracts";
import { extractAuthSessionFromCookies } from "../../../../auth/session-adapter";
import { getScopedPortfolioData } from "../../../../lib/operator-scope-portfolio";
import { requirePermission } from "../../../../api/organizations/permissions";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../../../../api/shared";
import { createTeamFunctionsRepo, createTenantLeaseRepo, jsonResponse, parseJsonBody } from "../../shared";

type PatchLeaseBody = {
  endDate: string | null;
  status: "active" | "ended" | "pending";
};

function validatePatchLeaseBody(input: unknown): ApiResult<PatchLeaseBody> {
  if (typeof input !== "object" || input === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "Body must be an object"
    };
  }

  const payload = input as Record<string, unknown>;
  const rawEndDate = payload.endDate;
  let endDate: string | null = null;

  if (rawEndDate !== null && rawEndDate !== undefined) {
    if (typeof rawEndDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(rawEndDate.trim())) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        error: "endDate must be YYYY-MM-DD or null"
      };
    }
    endDate = rawEndDate.trim();
  }

  if (typeof payload.status !== "string" || !["active", "ended", "pending"].includes(payload.status)) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "status must be one of: active, ended, pending"
    };
  }

  return {
    success: true,
    data: {
      endDate,
      status: payload.status as "active" | "ended" | "pending"
    }
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const access = requireOperatorSession(await extractAuthSessionFromCookies());

  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const permissionResult = await requirePermission(
    access.data,
    Permission.VIEW_LEASE,
    createTeamFunctionsRepo()
  );
  if (!permissionResult.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(permissionResult.code), permissionResult);
  }

  const repository = createTenantLeaseRepo();

  try {
    const lease = await repository.getLeaseById(id, access.data.organizationId);

    if (!lease) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Lease not found"
      });
    }

    const scopedPortfolio = await getScopedPortfolioData(access.data);
    if (!scopedPortfolio.unitIds.has(lease.unitId)) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Lease not found"
      });
    }

    return jsonResponse(200, {
      success: true,
      data: lease
    });
  } catch (error) {
    console.error("Failed to fetch lease", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to fetch lease"
    });
  }
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

  const permissionResult = await requirePermission(
    access.data,
    Permission.EDIT_LEASE,
    createTeamFunctionsRepo()
  );
  if (!permissionResult.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(permissionResult.code), permissionResult);
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

  const repository = createTenantLeaseRepo();

  const parsed = validatePatchLeaseBody(body);
  if (!parsed.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(parsed.code), parsed);
  }

  try {
    const scopedPortfolio = await getScopedPortfolioData(access.data);
    if (!scopedPortfolio.leaseIds.has(id)) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Lease not found"
      });
    }

    const lease = await repository.updateLease({
      id,
      organizationId: access.data.organizationId,
      endDate: parsed.data.endDate,
      status: parsed.data.status
    });

    if (!lease) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Lease not found"
      });
    }

    return jsonResponse(200, {
      success: true,
      data: lease
    });
  } catch (error) {
    console.error("Failed to update lease", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to update lease"
    });
  }
}
