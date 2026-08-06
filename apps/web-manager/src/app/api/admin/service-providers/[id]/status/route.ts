import { createPlatformAdminRepositoryFromEnv } from "@hhousing/data-access";
import { parseUpdateServiceProviderStatusInput } from "@hhousing/api-contracts";
import { randomUUID } from "crypto";
import { mapErrorCodeToHttpStatus, requirePlatformAdminSession } from "../../../../../../api/shared";
import { extractAuthSessionFromCookies } from "../../../../../../auth/session-adapter";
import { createServiceProviderRepo, jsonResponse, parseJsonBody } from "../../../../shared";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const access = requirePlatformAdminSession(await extractAuthSessionFromCookies());
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await parseJsonBody(request);
  } catch {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: "Invalid JSON body"
    });
  }

  const parsed = parseUpdateServiceProviderStatusInput(body);
  if (!parsed.success) {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: parsed.error.issues[0]?.message ?? "Invalid input"
    });
  }

  try {
    const repo = createServiceProviderRepo();
    const updated = await repo.setProviderStatus(id, parsed.data.status);
    if (!updated) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Service provider not found"
      });
    }

    const adminRepo = createPlatformAdminRepositoryFromEnv(process.env);
    await adminRepo.createPlatformAuditLog({
      id: randomUUID(),
      actorUserId: access.data.userId,
      actionKey:
        parsed.data.status === "suspended"
          ? "service_provider.suspend"
          : "service_provider.activate",
      entityType: "service_provider",
      entityId: id,
      metadata: { name: updated.name, status: updated.status }
    });

    return jsonResponse(200, { success: true, data: updated });
  } catch (error) {
    console.error("Failed to update service provider status", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to update service provider status"
    });
  }
}
