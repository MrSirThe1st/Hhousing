import { extractTenantSessionFromRequest } from "../../../../auth/session-adapter";
import { mapErrorCodeToHttpStatus } from "../../../../api/shared";
import { createRepositoryFromEnv, createTenantLeaseRepo, jsonResponse } from "../../shared";

export async function GET(request: Request): Promise<Response> {
  const access = await extractTenantSessionFromRequest(request);

  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const repository = createTenantLeaseRepo();
  const propertyRepositoryResult = createRepositoryFromEnv();

  if (!propertyRepositoryResult.success) {
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to load property repository"
    });
  }

  try {
    const lease = await repository.getCurrentLeaseByTenantAuthUserId(
      access.data.userId,
      access.data.organizationId
    );

    let rentalAddress: string | null = null;
    let propertyName: string | null = null;
    let unitLabel: string | null = null;
    let rentalPhotoUrl: string | null = null;

    if (lease) {
      const unit = await propertyRepositoryResult.data.getUnitById(
        lease.unitId,
        access.data.organizationId
      );

      if (unit) {
        const property = await propertyRepositoryResult.data.getPropertyById(
          unit.propertyId,
          access.data.organizationId
        );

        propertyName = property?.name ?? null;
        unitLabel = unit.unitNumber ?? null;

        if (property) {
          rentalAddress = `${property.address}, ${property.city}`;
          rentalPhotoUrl = property.photoUrls[0] ?? null;
        }
      }
    }

    return jsonResponse(200, {
      success: true,
      data: {
        lease,
        rentalAddress,
        propertyName,
        unitLabel,
        rentalPhotoUrl
      }
    });
  } catch (error) {
    console.error("Failed to fetch tenant lease", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to fetch tenant lease"
    });
  }
}
