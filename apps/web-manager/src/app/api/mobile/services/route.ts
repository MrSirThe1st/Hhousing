import { extractTenantSessionFromRequest } from "../../../../auth/session-adapter";
import { mapErrorCodeToHttpStatus } from "../../../../api/shared";
import {
  createRepositoryFromEnv,
  createServiceProviderRepo,
  createTenantLeaseRepo,
  jsonResponse
} from "../../shared";

export async function OPTIONS(request: Request): Promise<Response> {
  return jsonResponse(204, null, request);
}

export async function GET(request: Request): Promise<Response> {
  const access = await extractTenantSessionFromRequest(request);

  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access, request);
  }

  const leaseRepo = createTenantLeaseRepo();
  const propertyRepositoryResult = createRepositoryFromEnv();
  if (!propertyRepositoryResult.success) {
    return jsonResponse(
      500,
      {
        success: false,
        code: "INTERNAL_ERROR",
        error: "Failed to load property repository"
      },
      request
    );
  }

  try {
    const lease = await leaseRepo.getCurrentLeaseByTenantAuthUserId(
      access.data.userId,
      access.data.organizationId
    );

    if (!lease) {
      return jsonResponse(200, { success: true, data: { providers: [] } }, request);
    }

    const unit = await propertyRepositoryResult.data.getUnitById(
      lease.unitId,
      access.data.organizationId
    );

    if (!unit) {
      return jsonResponse(200, { success: true, data: { providers: [] } }, request);
    }

    const providers = await createServiceProviderRepo().listActiveProvidersForProperty(unit.propertyId);

    return jsonResponse(
      200,
      {
        success: true,
        data: {
          providers: providers.map((provider) => ({
            id: provider.id,
            name: provider.name,
            phone: provider.phone,
            whatsappPhone: provider.whatsappPhone,
            description: provider.description,
            city: provider.city,
            quartier: provider.quartier,
            categoryId: provider.categoryId,
            categoryName: provider.categoryName,
            isVerified: provider.isVerified,
            isPlatform: provider.organizationId === null,
            trustLabel: provider.isVerified || provider.organizationId === null
              ? "verified"
              : "landlord_added"
          }))
        }
      },
      request
    );
  } catch (error) {
    console.error("Failed to list tenant service providers", error);
    return jsonResponse(
      500,
      {
        success: false,
        code: "INTERNAL_ERROR",
        error: "Failed to list service providers"
      },
      request
    );
  }
}
