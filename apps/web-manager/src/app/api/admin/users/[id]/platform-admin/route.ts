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

  let body: { grant?: boolean };
  try {
    body = (await request.json()) as { grant?: boolean };
  } catch {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: "Invalid JSON body"
    });
  }

  if (typeof body.grant !== "boolean") {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: "grant must be a boolean"
    });
  }

  if (!body.grant && targetUserId === access.data.userId) {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: "You cannot revoke your own platform admin access"
    });
  }

  try {
    const repo = createPlatformAdminRepositoryFromEnv(process.env);

    if (body.grant) {
      const data = await repo.grantPlatformAdmin({
        userId: targetUserId,
        createdByUserId: access.data.userId
      });
      await repo.createPlatformAuditLog({
        id: randomUUID(),
        actorUserId: access.data.userId,
        actionKey: "platform_admin.grant",
        entityType: "platform_admin",
        entityId: targetUserId,
        metadata: {}
      });
      return jsonResponse(200, { success: true, data });
    }

    const revoked = await repo.revokePlatformAdmin(targetUserId);
    if (!revoked) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "User is not an active platform admin"
      });
    }

    await repo.createPlatformAuditLog({
      id: randomUUID(),
      actorUserId: access.data.userId,
      actionKey: "platform_admin.revoke",
      entityType: "platform_admin",
      entityId: targetUserId,
      metadata: {}
    });

    return jsonResponse(200, { success: true, data: { userId: targetUserId, revoked: true } });
  } catch (error) {
    console.error("Failed to update platform admin grant", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to update platform admin access"
    });
  }
}
