import { extractTenantSessionFromRequest } from "../../../../auth/session-adapter";
import { mapErrorCodeToHttpStatus } from "../../../../api/shared";
import { createTenantLeaseRepo, jsonResponse, parseJsonBody } from "../../shared";

export async function GET(request: Request): Promise<Response> {
  const access = await extractTenantSessionFromRequest(request);

  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const repo = createTenantLeaseRepo();

  try {
    const lease = await repo.getCurrentLeaseByTenantAuthUserId(
      access.data.userId,
      access.data.organizationId
    );

    if (!lease) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "No active lease found"
      });
    }

    const tenant = await repo.getTenantById(lease.tenantId, access.data.organizationId);

    if (!tenant) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Tenant profile not found"
      });
    }

    return jsonResponse(200, {
      success: true,
      data: { tenant }
    });
  } catch (error) {
    console.error("Failed to fetch tenant profile", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to fetch profile"
    });
  }
}

interface UpdateProfileBody {
  fullName: string;
  phone: string | null;
}

function parseUpdateBody(
  raw: unknown
): { success: true; data: UpdateProfileBody } | { success: false; error: string } {
  if (typeof raw !== "object" || raw === null) {
    return { success: false, error: "Body must be an object" };
  }
  const obj = raw as Record<string, unknown>;
  const fullName = typeof obj.fullName === "string" ? obj.fullName.trim() : "";
  if (!fullName) {
    return { success: false, error: "fullName is required" };
  }
  const phone =
    typeof obj.phone === "string" && obj.phone.trim()
      ? obj.phone.trim()
      : null;
  return { success: true, data: { fullName, phone } };
}

export async function PATCH(request: Request): Promise<Response> {
  const access = await extractTenantSessionFromRequest(request);

  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const raw = await parseJsonBody(request);
  const parsed = parseUpdateBody(raw);

  if (!parsed.success) {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: parsed.error
    });
  }

  const repo = createTenantLeaseRepo();

  try {
    const lease = await repo.getCurrentLeaseByTenantAuthUserId(
      access.data.userId,
      access.data.organizationId
    );

    if (!lease) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "No active lease found"
      });
    }

    const existing = await repo.getTenantById(lease.tenantId, access.data.organizationId);

    if (!existing) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Tenant profile not found"
      });
    }

    const updated = await repo.updateTenant({
      id: existing.id,
      organizationId: access.data.organizationId,
      fullName: parsed.data.fullName,
      email: existing.email,
      phone: parsed.data.phone,
      dateOfBirth: existing.dateOfBirth,
      photoUrl: existing.photoUrl,
      employmentStatus: existing.employmentStatus,
      jobTitle: existing.jobTitle,
      monthlyIncome: existing.monthlyIncome,
      numberOfOccupants: existing.numberOfOccupants
    });

    if (!updated) {
      return jsonResponse(500, {
        success: false,
        code: "INTERNAL_ERROR",
        error: "Failed to update profile"
      });
    }

    return jsonResponse(200, {
      success: true,
      data: { tenant: updated }
    });
  } catch (error) {
    console.error("Failed to update tenant profile", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to update profile"
    });
  }
}
