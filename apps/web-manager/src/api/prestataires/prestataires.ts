import type {
  ApiResult,
  AuthSession,
  ServiceProvider,
  ServiceProviderCategory,
  ServiceProviderWithCategory
} from "@hhousing/api-contracts";
import {
  Permission,
  parseAssignServiceProviderInput,
  parseCreateServiceProviderInput,
  parseUnassignServiceProviderInput,
  parseUpdateServiceProviderInput
} from "@hhousing/api-contracts";
import type { ServiceProviderRepository } from "@hhousing/data-access";
import { requirePermission, type TeamPermissionRepository } from "../organizations/permissions";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../shared";

export interface PrestatairesCatalog {
  categories: ServiceProviderCategory[];
  platformProviders: ServiceProviderWithCategory[];
  orgProviders: ServiceProviderWithCategory[];
  assignments: Array<{ propertyId: string; serviceProviderId: string; createdAtIso: string }>;
}

export interface PrestatairesDeps {
  repository: ServiceProviderRepository;
  teamFunctionsRepository: TeamPermissionRepository;
  createId: () => string;
}

async function requireVendorsWrite(
  session: AuthSession | null,
  teamFunctionsRepository: TeamPermissionRepository
) {
  const sessionResult = requireOperatorSession(session);
  if (!sessionResult.success) {
    return { ok: false as const, response: { status: mapErrorCodeToHttpStatus(sessionResult.code), body: sessionResult } };
  }

  const permissionResult = await requirePermission(
    sessionResult.data,
    Permission.ASSIGN_VENDORS,
    teamFunctionsRepository,
    true
  );
  if (!permissionResult.success) {
    return {
      ok: false as const,
      response: { status: mapErrorCodeToHttpStatus(permissionResult.code), body: permissionResult }
    };
  }

  return { ok: true as const, session: sessionResult.data };
}

export async function listPrestatairesCatalog(
  session: AuthSession | null,
  deps: Pick<PrestatairesDeps, "repository">
): Promise<{ status: number; body: ApiResult<PrestatairesCatalog> }> {
  const sessionResult = requireOperatorSession(session);
  if (!sessionResult.success) {
    return { status: mapErrorCodeToHttpStatus(sessionResult.code), body: sessionResult };
  }

  const organizationId = sessionResult.data.organizationId;
  const [categories, platformProviders, orgProviders, assignments] = await Promise.all([
    deps.repository.listCategories(),
    deps.repository.listProviders({ platformOnly: true, status: "active" }),
    deps.repository.listProviders({ organizationId, status: "active" }),
    deps.repository.listAssignmentsForOrganization(organizationId)
  ]);

  return {
    status: 200,
    body: {
      success: true,
      data: { categories, platformProviders, orgProviders, assignments }
    }
  };
}

export async function createOrgServiceProvider(
  request: { body: unknown; session: AuthSession | null },
  deps: PrestatairesDeps
): Promise<{ status: number; body: ApiResult<ServiceProvider> }> {
  const access = await requireVendorsWrite(request.session, deps.teamFunctionsRepository);
  if (!access.ok) return access.response;

  const parsed = parseCreateServiceProviderInput(request.body);
  if (!parsed.success) {
    return {
      status: 400,
      body: {
        success: false,
        code: "VALIDATION_ERROR",
        error: parsed.error.issues[0]?.message ?? "Invalid input"
      }
    };
  }

  const category = await deps.repository.getCategoryById(parsed.data.categoryId);
  if (!category) {
    return {
      status: 400,
      body: { success: false, code: "VALIDATION_ERROR", error: "Category not found" }
    };
  }

  const created = await deps.repository.createProvider({
    id: deps.createId(),
    organizationId: access.session.organizationId,
    categoryId: parsed.data.categoryId,
    name: parsed.data.name,
    phone: parsed.data.phone,
    whatsappPhone: parsed.data.whatsappPhone ?? null,
    description: parsed.data.description ?? null,
    city: parsed.data.city ?? null,
    quartier: parsed.data.quartier ?? null,
    status: "active",
    isVerified: false,
    createdByOrganizationId: access.session.organizationId
  });

  return { status: 201, body: { success: true, data: created } };
}

export async function updateOrgServiceProvider(
  request: { id: string; body: unknown; session: AuthSession | null },
  deps: PrestatairesDeps
): Promise<{ status: number; body: ApiResult<ServiceProvider> }> {
  const access = await requireVendorsWrite(request.session, deps.teamFunctionsRepository);
  if (!access.ok) return access.response;

  const parsed = parseUpdateServiceProviderInput(request.body);
  if (!parsed.success) {
    return {
      status: 400,
      body: {
        success: false,
        code: "VALIDATION_ERROR",
        error: parsed.error.issues[0]?.message ?? "Invalid input"
      }
    };
  }

  if (parsed.data.isVerified !== undefined) {
    return {
      status: 403,
      body: { success: false, code: "FORBIDDEN", error: "Only platform admin can set verification" }
    };
  }

  const existing = await deps.repository.getProviderById(request.id);
  if (!existing || existing.organizationId !== access.session.organizationId) {
    return {
      status: 404,
      body: { success: false, code: "NOT_FOUND", error: "Service provider not found" }
    };
  }

  if (parsed.data.categoryId) {
    const category = await deps.repository.getCategoryById(parsed.data.categoryId);
    if (!category) {
      return {
        status: 400,
        body: { success: false, code: "VALIDATION_ERROR", error: "Category not found" }
      };
    }
  }

  const updated = await deps.repository.updateProvider({
    id: request.id,
    organizationId: access.session.organizationId,
    categoryId: parsed.data.categoryId,
    name: parsed.data.name,
    phone: parsed.data.phone,
    whatsappPhone: parsed.data.whatsappPhone,
    description: parsed.data.description,
    city: parsed.data.city,
    quartier: parsed.data.quartier
  });

  if (!updated) {
    return {
      status: 404,
      body: { success: false, code: "NOT_FOUND", error: "Service provider not found" }
    };
  }

  return { status: 200, body: { success: true, data: updated } };
}

export async function deleteOrgServiceProvider(
  request: { id: string; session: AuthSession | null },
  deps: PrestatairesDeps
): Promise<{ status: number; body: ApiResult<{ success: boolean }> }> {
  const access = await requireVendorsWrite(request.session, deps.teamFunctionsRepository);
  if (!access.ok) return access.response;

  const deleted = await deps.repository.deleteProvider(request.id, access.session.organizationId);
  if (!deleted) {
    return {
      status: 404,
      body: { success: false, code: "NOT_FOUND", error: "Service provider not found" }
    };
  }

  return { status: 200, body: { success: true, data: { success: true } } };
}

export async function assignServiceProviderToProperty(
  request: { body: unknown; session: AuthSession | null; propertyIds: Set<string> },
  deps: PrestatairesDeps
): Promise<{ status: number; body: ApiResult<{ success: boolean }> }> {
  const access = await requireVendorsWrite(request.session, deps.teamFunctionsRepository);
  if (!access.ok) return access.response;

  const parsed = parseAssignServiceProviderInput(request.body);
  if (!parsed.success) {
    return {
      status: 400,
      body: {
        success: false,
        code: "VALIDATION_ERROR",
        error: parsed.error.issues[0]?.message ?? "Invalid input"
      }
    };
  }

  if (!request.propertyIds.has(parsed.data.propertyId)) {
    return {
      status: 404,
      body: { success: false, code: "NOT_FOUND", error: "Property not found" }
    };
  }

  const provider = await deps.repository.getProviderById(parsed.data.serviceProviderId);
  if (!provider || provider.status !== "active") {
    return {
      status: 404,
      body: { success: false, code: "NOT_FOUND", error: "Service provider not found" }
    };
  }

  const isPlatform = provider.organizationId === null;
  const isOwn = provider.organizationId === access.session.organizationId;
  if (!isPlatform && !isOwn) {
    return {
      status: 403,
      body: { success: false, code: "FORBIDDEN", error: "Cannot assign this provider" }
    };
  }

  await deps.repository.assignProvider({
    propertyId: parsed.data.propertyId,
    serviceProviderId: parsed.data.serviceProviderId,
    organizationId: access.session.organizationId
  });

  return { status: 200, body: { success: true, data: { success: true } } };
}

export async function unassignServiceProviderFromProperty(
  request: { body: unknown; session: AuthSession | null; propertyIds: Set<string> },
  deps: PrestatairesDeps
): Promise<{ status: number; body: ApiResult<{ success: boolean }> }> {
  const access = await requireVendorsWrite(request.session, deps.teamFunctionsRepository);
  if (!access.ok) return access.response;

  const parsed = parseUnassignServiceProviderInput(request.body);
  if (!parsed.success) {
    return {
      status: 400,
      body: {
        success: false,
        code: "VALIDATION_ERROR",
        error: parsed.error.issues[0]?.message ?? "Invalid input"
      }
    };
  }

  if (!request.propertyIds.has(parsed.data.propertyId)) {
    return {
      status: 404,
      body: { success: false, code: "NOT_FOUND", error: "Property not found" }
    };
  }

  const removed = await deps.repository.unassignProvider(
    parsed.data.propertyId,
    parsed.data.serviceProviderId,
    access.session.organizationId
  );

  if (!removed) {
    return {
      status: 404,
      body: { success: false, code: "NOT_FOUND", error: "Assignment not found" }
    };
  }

  return { status: 200, body: { success: true, data: { success: true } } };
}
