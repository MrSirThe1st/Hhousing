import { extractAuthSessionFromCookies } from "../../../../auth/session-adapter";
import { createTenantLeaseRepo, jsonResponse, parseJsonBody } from "../../shared";

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

  const repository = createTenantLeaseRepo();

  try {
    const tenant = await repository.getTenantById(id, session.organizationId);

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

  const repository = createTenantLeaseRepo();

  const payload = body as Record<string, unknown>;
  const fullName = typeof payload.fullName === "string" ? payload.fullName.trim() : "";
  const email = typeof payload.email === "string" ? payload.email.trim() || null : null;
  const phone = typeof payload.phone === "string" ? payload.phone.trim() || null : null;

  if (!fullName) {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: "fullName is required"
    });
  }

  try {
    const tenant = await repository.updateTenant({
      id,
      organizationId: session.organizationId,
      fullName,
      email,
      phone
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
  const session = await extractAuthSessionFromCookies();

  if (!session) {
    return jsonResponse(401, {
      success: false,
      code: "UNAUTHORIZED",
      error: "Authentication required"
    });
  }

  const repository = createTenantLeaseRepo();

  try {
    const deleted = await repository.deleteTenant(id, session.organizationId);

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
