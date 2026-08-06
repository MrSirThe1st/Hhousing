import { createPlatformAdminRepositoryFromEnv } from "@hhousing/data-access";
import { parseUpdateServiceProviderInput } from "@hhousing/api-contracts";
import { randomUUID } from "crypto";
import { mapErrorCodeToHttpStatus, requirePlatformAdminSession } from "../../../../../api/shared";
import { extractAuthSessionFromCookies } from "../../../../../auth/session-adapter";
import { createServiceProviderRepo, jsonResponse, parseJsonBody } from "../../../shared";

export async function GET(
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
    const provider = await repo.getProviderById(id);
    if (!provider) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Service provider not found"
      });
    }
    return jsonResponse(200, { success: true, data: provider });
  } catch (error) {
    console.error("Failed to get service provider", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to get service provider"
    });
  }
}

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

  const parsed = parseUpdateServiceProviderInput(body);
  if (!parsed.success) {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: parsed.error.issues[0]?.message ?? "Invalid input"
    });
  }

  try {
    const repo = createServiceProviderRepo();
    if (parsed.data.categoryId) {
      const category = await repo.getCategoryById(parsed.data.categoryId);
      if (!category) {
        return jsonResponse(400, {
          success: false,
          code: "VALIDATION_ERROR",
          error: "Category not found"
        });
      }
    }

    const updated = await repo.updateProvider({
      id,
      categoryId: parsed.data.categoryId,
      name: parsed.data.name,
      phone: parsed.data.phone,
      whatsappPhone: parsed.data.whatsappPhone,
      description: parsed.data.description,
      city: parsed.data.city,
      quartier: parsed.data.quartier,
      isVerified: parsed.data.isVerified
    });

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
      actionKey: "service_provider.update",
      entityType: "service_provider",
      entityId: id,
      metadata: { name: updated.name }
    });

    return jsonResponse(200, { success: true, data: updated });
  } catch (error) {
    console.error("Failed to update service provider", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to update service provider"
    });
  }
}

export async function DELETE(
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

    const deleted = await repo.deleteProvider(id);
    if (!deleted) {
      return jsonResponse(500, {
        success: false,
        code: "INTERNAL_ERROR",
        error: "Failed to delete service provider"
      });
    }

    const adminRepo = createPlatformAdminRepositoryFromEnv(process.env);
    await adminRepo.createPlatformAuditLog({
      id: randomUUID(),
      actorUserId: access.data.userId,
      actionKey: "service_provider.delete",
      entityType: "service_provider",
      entityId: id,
      metadata: { name: existing.name }
    });

    return jsonResponse(200, { success: true, data: { success: true } });
  } catch (error) {
    console.error("Failed to delete service provider", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to delete service provider"
    });
  }
}
