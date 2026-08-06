import { createPlatformAdminRepositoryFromEnv } from "@hhousing/data-access";
import { parseCreateServiceProviderInput } from "@hhousing/api-contracts";
import { randomUUID } from "crypto";
import { mapErrorCodeToHttpStatus, requirePlatformAdminSession } from "../../../../api/shared";
import { extractAuthSessionFromCookies } from "../../../../auth/session-adapter";
import { createId, createServiceProviderRepo, jsonResponse, parseJsonBody } from "../../shared";

export async function GET(request: Request): Promise<Response> {
  const access = requirePlatformAdminSession(await extractAuthSessionFromCookies());
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  try {
    const url = new URL(request.url);
    const categoryId = url.searchParams.get("categoryId") || undefined;
    const statusParam = url.searchParams.get("status");
    const status =
      statusParam === "active" || statusParam === "suspended" ? statusParam : undefined;
    const source = url.searchParams.get("source");

    const repo = createServiceProviderRepo();
    const providers = await repo.listProviders({
      categoryId,
      status,
      platformOnly: source === "platform" ? true : undefined
    });

    const filtered =
      source === "landlord"
        ? providers.filter((provider) => provider.organizationId !== null)
        : providers;

    return jsonResponse(200, { success: true, data: filtered });
  } catch (error) {
    console.error("Failed to list service providers", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to list service providers"
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

  const parsed = parseCreateServiceProviderInput(body);
  if (!parsed.success) {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: parsed.error.issues[0]?.message ?? "Invalid input"
    });
  }

  try {
    const repo = createServiceProviderRepo();
    const category = await repo.getCategoryById(parsed.data.categoryId);
    if (!category) {
      return jsonResponse(400, {
        success: false,
        code: "VALIDATION_ERROR",
        error: "Category not found"
      });
    }

    const created = await repo.createProvider({
      id: createId("sp"),
      organizationId: null,
      categoryId: parsed.data.categoryId,
      name: parsed.data.name,
      phone: parsed.data.phone,
      whatsappPhone: parsed.data.whatsappPhone ?? null,
      description: parsed.data.description ?? null,
      city: parsed.data.city ?? null,
      quartier: parsed.data.quartier ?? null,
      status: "active",
      isVerified: parsed.data.isVerified ?? true,
      createdByOrganizationId: null
    });

    const adminRepo = createPlatformAdminRepositoryFromEnv(process.env);
    await adminRepo.createPlatformAuditLog({
      id: randomUUID(),
      actorUserId: access.data.userId,
      actionKey: "service_provider.create",
      entityType: "service_provider",
      entityId: created.id,
      metadata: { name: created.name }
    });

    return jsonResponse(201, { success: true, data: created });
  } catch (error) {
    console.error("Failed to create service provider", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to create service provider"
    });
  }
}
