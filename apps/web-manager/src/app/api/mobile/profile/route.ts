import { extractTenantSessionFromRequest } from "../../../../auth/session-adapter";
import { mapErrorCodeToHttpStatus } from "../../../../api/shared";
import { validateTenantPhoneForLease } from "@hhousing/api-contracts";
import { normalizeWhatsAppPhoneNumber } from "../../../../lib/whatsapp/phone";
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
  whatsappOptIn: boolean;
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
  const whatsappOptIn = typeof obj.whatsappOptIn === "boolean" ? obj.whatsappOptIn : true;
  return { success: true, data: { fullName, phone, whatsappOptIn } };
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

  if (parsed.data.whatsappOptIn) {
    const phoneValidation = validateTenantPhoneForLease(parsed.data.phone);
    if (!phoneValidation.success) {
      return jsonResponse(400, {
        success: false,
        code: "VALIDATION_ERROR",
        error: "Un numéro de téléphone valide est requis pour activer WhatsApp"
      });
    }
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

    const normalizedPhone = parsed.data.phone
      ? normalizeWhatsAppPhoneNumber(parsed.data.phone)
      : null;
    const whatsappNumber = parsed.data.whatsappOptIn && normalizedPhone
      ? normalizedPhone
      : null;

    const updated = await repo.updateTenantMobileProfile({
      id: existing.id,
      organizationId: access.data.organizationId,
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      whatsappOptIn: parsed.data.whatsappOptIn,
      whatsappNumber
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
