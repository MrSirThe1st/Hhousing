import { createPlatformAdminRepositoryFromEnv } from "@hhousing/data-access";
import {
  parseCreateServiceProviderCategoryInput,
  parseUpdateServiceProviderCategoryInput
} from "@hhousing/api-contracts";
import { randomUUID } from "crypto";
import { mapErrorCodeToHttpStatus, requirePlatformAdminSession } from "../../../../../api/shared";
import { extractAuthSessionFromCookies } from "../../../../../auth/session-adapter";
import { createId, createServiceProviderRepo, jsonResponse, parseJsonBody } from "../../../shared";

export async function GET(): Promise<Response> {
  const access = requirePlatformAdminSession(await extractAuthSessionFromCookies());
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  try {
    const repo = createServiceProviderRepo();
    const categories = await repo.listCategories();
    return jsonResponse(200, { success: true, data: categories });
  } catch (error) {
    console.error("Failed to list service provider categories", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to list categories"
    });
  }
}

export async function POST(request: Request): Promise<Response> {
  const access = requirePlatformAdminSession(await extractAuthSessionFromCookies());
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

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

  const parsed = parseCreateServiceProviderCategoryInput(body);
  if (!parsed.success) {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: parsed.error.issues[0]?.message ?? "Invalid input"
    });
  }

  try {
    const repo = createServiceProviderRepo();
    const created = await repo.createCategory({
      id: createId("spc"),
      name: parsed.data.name,
      slug: parsed.data.slug,
      sortOrder: parsed.data.sortOrder ?? 100
    });

    const adminRepo = createPlatformAdminRepositoryFromEnv(process.env);
    await adminRepo.createPlatformAuditLog({
      id: randomUUID(),
      actorUserId: access.data.userId,
      actionKey: "service_provider_category.create",
      entityType: "service_provider_category",
      entityId: created.id,
      metadata: { name: created.name, slug: created.slug }
    });

    return jsonResponse(201, { success: true, data: created });
  } catch (error) {
    console.error("Failed to create category", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to create category"
    });
  }
}

export async function PATCH(request: Request): Promise<Response> {
  const access = requirePlatformAdminSession(await extractAuthSessionFromCookies());
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

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

  const record = body as { id?: string } & Record<string, unknown>;
  if (!record.id || typeof record.id !== "string") {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: "id is required"
    });
  }

  const parsed = parseUpdateServiceProviderCategoryInput(record);
  if (!parsed.success) {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: parsed.error.issues[0]?.message ?? "Invalid input"
    });
  }

  try {
    const repo = createServiceProviderRepo();
    const updated = await repo.updateCategory({
      id: record.id,
      name: parsed.data.name,
      slug: parsed.data.slug,
      sortOrder: parsed.data.sortOrder
    });

    if (!updated) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Category not found"
      });
    }

    const adminRepo = createPlatformAdminRepositoryFromEnv(process.env);
    await adminRepo.createPlatformAuditLog({
      id: randomUUID(),
      actorUserId: access.data.userId,
      actionKey: "service_provider_category.update",
      entityType: "service_provider_category",
      entityId: updated.id,
      metadata: { name: updated.name }
    });

    return jsonResponse(200, { success: true, data: updated });
  } catch (error) {
    console.error("Failed to update category", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to update category"
    });
  }
}

export async function DELETE(request: Request): Promise<Response> {
  const access = requirePlatformAdminSession(await extractAuthSessionFromCookies());
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: "id is required"
    });
  }

  try {
    const repo = createServiceProviderRepo();
    const existing = await repo.getCategoryById(id);
    if (!existing) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Category not found"
      });
    }

    const deleted = await repo.deleteCategory(id);
    if (!deleted) {
      return jsonResponse(409, {
        success: false,
        code: "CONFLICT",
        error: "Category is in use by one or more providers"
      });
    }

    const adminRepo = createPlatformAdminRepositoryFromEnv(process.env);
    await adminRepo.createPlatformAuditLog({
      id: randomUUID(),
      actorUserId: access.data.userId,
      actionKey: "service_provider_category.delete",
      entityType: "service_provider_category",
      entityId: id,
      metadata: { name: existing.name }
    });

    return jsonResponse(200, { success: true, data: { success: true } });
  } catch (error) {
    console.error("Failed to delete category", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to delete category"
    });
  }
}
