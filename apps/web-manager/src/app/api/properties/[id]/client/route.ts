import { Permission, type ApiResult } from "@hhousing/api-contracts";
import { extractAuthSessionFromCookies } from "../../../../../auth/session-adapter";
import { getScopedPortfolioData } from "../../../../../lib/operator-scope-portfolio";
import { requirePermission } from "../../../../../api/organizations/permissions";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../../../../../api/shared";
import { createRepositoryFromEnv, createTeamFunctionsRepo, jsonResponse, parseJsonBody } from "../../../shared";

type PatchPropertyClientBody = {
  clientId: string | null;
};

function validatePatchPropertyClientBody(input: unknown): ApiResult<PatchPropertyClientBody> {
  if (typeof input !== "object" || input === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "Body must be an object"
    };
  }

  const payload = input as Record<string, unknown>;
  const clientId = typeof payload.clientId === "string"
    ? payload.clientId.trim() || null
    : payload.clientId === null || payload.clientId === undefined
    ? null
    : null;

  return {
    success: true,
    data: {
      clientId
    }
  };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const session = await extractAuthSessionFromCookies();
  const access = requireOperatorSession(session);

  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const permissionResult = await requirePermission(
    access.data,
    Permission.MANAGE_PROPERTIES,
    createTeamFunctionsRepo()
  );
  if (!permissionResult.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(permissionResult.code), permissionResult);
  }

  let body: unknown;
  try {
    body = await parseJsonBody(request);
  } catch {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: "Body must be valid JSON"
    });
  }

  const parsed = validatePatchPropertyClientBody(body);
  if (!parsed.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(parsed.code), parsed);
  }

  const repositoryResult = createRepositoryFromEnv();
  if (!repositoryResult.success) {
    return jsonResponse(500, repositoryResult);
  }

  const repository = repositoryResult.data;

  try {
    const scopedPortfolio = await getScopedPortfolioData(access.data);
    if (!scopedPortfolio.propertyIds.has(id)) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Property not found"
      });
    }

    const property = await repository.getPropertyById(id, access.data.organizationId);
    if (!property) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Property not found"
      });
    }

    let ownerId: string;
    let ownerName: string;
    let ownerType: "organization" | "client";

    if (parsed.data.clientId) {
      const ownerClient = await repository.getOwnerClientById(parsed.data.clientId, access.data.organizationId);

      if (!ownerClient) {
        return jsonResponse(404, {
          success: false,
          code: "NOT_FOUND",
          error: "Client not found"
        });
      }

      ownerId = ownerClient.id;
      ownerName = ownerClient.name;
      ownerType = "client";
    } else {
      const owners = await repository.listOwners(access.data.organizationId);
      const organizationOwner = owners.find((owner) => owner.ownerType === "organization");

      if (!organizationOwner) {
        return jsonResponse(500, {
          success: false,
          code: "INTERNAL_ERROR",
          error: "Organization owner not found"
        });
      }

      ownerId = organizationOwner.id;
      ownerName = organizationOwner.name;
      ownerType = "organization";
    }

    const updatedProperty = await repository.updateProperty({
      id: property.id,
      organizationId: access.data.organizationId,
      name: property.name,
      address: property.address,
      city: property.city,
      countryCode: property.countryCode,
      ownerId,
      ownerName,
      ownerType
    });

    if (!updatedProperty) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Property not found"
      });
    }

    return jsonResponse(200, {
      success: true,
      data: updatedProperty
    });
  } catch (error) {
    console.error("Failed to update property client", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to update property client"
    });
  }
}