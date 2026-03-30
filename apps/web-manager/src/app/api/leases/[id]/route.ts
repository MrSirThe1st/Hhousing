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
    const lease = await repository.getLeaseById(id, session.organizationId);

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
  const endDate = typeof payload.endDate === "string" ? payload.endDate.trim() || null : null;
  const status = typeof payload.status === "string" && ["active", "ended", "pending"].includes(payload.status)
    ? payload.status as "active" | "ended" | "pending"
    : "active";

  try {
    const lease = await repository.updateLease({
      id,
      organizationId: session.organizationId,
      endDate,
      status
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
