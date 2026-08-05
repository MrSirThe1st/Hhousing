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

  const { id: targetUserId } = await context.params;

  let body: { status?: string; reason?: string | null };
  try {
    body = (await request.json()) as { status?: string; reason?: string | null };
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

  if (targetUserId === access.data.userId && body.status === "suspended") {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: "You cannot suspend your own account"
    });
  }

  try {
    const repo = createPlatformAdminRepositoryFromEnv(process.env);
    const data = await repo.upsertPlatformUserStatus({
      userId: targetUserId,
      status: body.status,
      reason: body.reason ?? null,
      updatedByUserId: access.data.userId
    });

    await repo.createPlatformAuditLog({
      id: randomUUID(),
      actorUserId: access.data.userId,
      actionKey: body.status === "suspended" ? "user.suspend" : "user.activate",
      entityType: "user",
      entityId: targetUserId,
      metadata: { reason: body.reason ?? null }
    });

    return jsonResponse(200, { success: true, data });
  } catch (error) {
    console.error("Failed to update platform user status", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to update user status"
    });
  }
}
