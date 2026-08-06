import { createPlatformAdminRepositoryFromEnv } from "@hhousing/data-access";
import { randomUUID } from "crypto";
import { mapErrorCodeToHttpStatus, requirePlatformAdminSession } from "../../../../../../api/shared";
import { extractAuthSessionFromCookies } from "../../../../../../auth/session-adapter";
import { createServiceProviderRepo, jsonResponse } from "../../../../shared";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const access = requirePlatformAdminSession(await extractAuthSessionFromCookies());
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const { id } = await context.params;

  try {
    const repo = createServiceProviderRepo();
    const existing = await repo.getProviderById(id);
    if (!existing) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Service provider not found"
      });
    }

    if (existing.organizationId === null) {
      return jsonResponse(400, {
        success: false,
        code: "VALIDATION_ERROR",
        error: "Provider is already a platform provider"
      });
    }

    const promoted = await repo.promoteProvider(id);
    if (!promoted) {
      return jsonResponse(500, {
        success: false,
        code: "INTERNAL_ERROR",
        error: "Failed to promote service provider"
      });
    }

    const adminRepo = createPlatformAdminRepositoryFromEnv(process.env);
    await adminRepo.createPlatformAuditLog({
      id: randomUUID(),
      actorUserId: access.data.userId,
      actionKey: "service_provider.promote",
      entityType: "service_provider",
      entityId: id,
      metadata: {
        name: promoted.name,
        previousOrganizationId: existing.organizationId
      }
    });

    return jsonResponse(200, { success: true, data: promoted });
  } catch (error) {
    console.error("Failed to promote service provider", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to promote service provider"
    });
  }
}
