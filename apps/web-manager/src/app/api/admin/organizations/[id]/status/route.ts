import { createPlatformAdminRepositoryFromEnv } from "@hhousing/data-access";
import { mapErrorCodeToHttpStatus, requirePlatformAdminSession } from "../../../../../../api/shared";
import { extractAuthSessionFromCookies } from "../../../../../../auth/session-adapter";
import { jsonResponse } from "../../../../shared";
import { randomUUID } from "crypto";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const access = requirePlatformAdminSession(await extractAuthSessionFromCookies());
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const { id: organizationId } = await context.params;

  let body: { status?: string };
  try {
    body = (await request.json()) as { status?: string };
  } catch {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: "Invalid JSON body"
    });
  }

  if (body.status !== "active" && body.status !== "suspended") {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: "status must be active or suspended"
    });
  }

  try {
    const repo = createPlatformAdminRepositoryFromEnv(process.env);
    const data = await repo.setOrganizationStatus({
      organizationId,
      status: body.status
    });

    if (data === null) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Organization not found"
      });
    }

    await repo.createPlatformAuditLog({
      id: randomUUID(),
      actorUserId: access.data.userId,
      actionKey: body.status === "suspended" ? "organization.suspend" : "organization.activate",
      entityType: "organization",
      entityId: organizationId,
      metadata: { name: data.name }
    });

    return jsonResponse(200, { success: true, data });
  } catch (error) {
    console.error("Failed to update organization status", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to update organization status"
    });
  }
}
