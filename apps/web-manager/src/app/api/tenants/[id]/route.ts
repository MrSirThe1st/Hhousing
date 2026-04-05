import type { ApiResult } from "@hhousing/api-contracts";
import { extractAuthSessionFromCookies } from "../../../../auth/session-adapter";
import { getScopedPortfolioData } from "../../../../lib/operator-scope-portfolio";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../../../../api/shared";
import { createTenantLeaseRepo, jsonResponse, parseJsonBody } from "../../shared";

type PatchTenantBody = {
  fullName: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  photoUrl: string | null;
};

function validatePatchTenantBody(input: unknown): ApiResult<PatchTenantBody> {
  if (typeof input !== "object" || input === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "Body must be an object"
    };
  }

  const payload = input as Record<string, unknown>;
  const fullName = typeof payload.fullName === "string" ? payload.fullName.trim() : "";
  const email = typeof payload.email === "string" ? payload.email.trim() || null : null;
  const phone = typeof payload.phone === "string" ? payload.phone.trim() || null : null;
  const dateOfBirth = typeof payload.dateOfBirth === "string" ? payload.dateOfBirth.trim() || null : null;
  const photoUrl = typeof payload.photoUrl === "string" ? payload.photoUrl.trim() || null : null;

  if (!fullName) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "fullName is required"
    };
  }

  return {
    success: true,
    data: {
      fullName,
      email,
      phone,
      dateOfBirth,
      photoUrl
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

  const repository = createTenantLeaseRepo();

  try {
    const tenant = await repository.getTenantById(id, access.data.organizationId);

    if (!tenant) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Tenant not found"
      });
    }

    const scopedPortfolio = await getScopedPortfolioData(access.data);
    if (!scopedPortfolio.tenantIds.has(tenant.id)) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Tenant not found"
      });
    }

    return jsonResponse(200, {
      success: true,
      data: tenant
    });
  } catch (error) {
    console.error("Failed to fetch tenant", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to fetch tenant"
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

  const parsed = validatePatchTenantBody(body);
  if (!parsed.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(parsed.code), parsed);
  }

  try {
    const scopedPortfolio = await getScopedPortfolioData(access.data);
    if (!scopedPortfolio.tenantIds.has(id)) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Tenant not found"
      });
    }

    const existingTenant = await repository.getTenantById(id, access.data.organizationId);

    if (!existingTenant) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Tenant not found"
      });
    }

    const tenant = await repository.updateTenant({
      id,
      organizationId: access.data.organizationId,
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      dateOfBirth: parsed.data.dateOfBirth ?? existingTenant.dateOfBirth,
      photoUrl: parsed.data.photoUrl ?? existingTenant.photoUrl
    });

    if (!tenant) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Tenant not found"
      });
    }

    return jsonResponse(200, {
      success: true,
      data: tenant
    });
  } catch (error) {
    console.error("Failed to update tenant", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to update tenant"
    });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const access = requireOperatorSession(await extractAuthSessionFromCookies());

  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const repository = createTenantLeaseRepo();

  try {
    const scopedPortfolio = await getScopedPortfolioData(access.data);
    if (!scopedPortfolio.tenantIds.has(id)) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Tenant not found"
      });
    }

    const deleted = await repository.deleteTenant(id, access.data.organizationId);

    if (!deleted) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Tenant not found"
      });
    }

    return jsonResponse(200, {
      success: true,
      data: { deleted: true }
    });
  } catch (error) {
    console.error("Failed to delete tenant", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to delete tenant"
    });
  }
}
