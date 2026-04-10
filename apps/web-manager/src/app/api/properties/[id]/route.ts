import type { ApiResult } from "@hhousing/api-contracts";
import { extractAuthSessionFromCookies } from "../../../../auth/session-adapter";
import { isScopeAllowedForSession } from "../../../../lib/operator-context";
import { getScopedPortfolioData } from "../../../../lib/operator-scope-portfolio";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../../../../api/shared";
import { createRepositoryFromEnv, jsonResponse, parseJsonBody } from "../../shared";

type PatchPropertyBody = {
  name: string;
  address: string;
  city: string;
  countryCode: string;
  managementContext: "owned" | "managed";
  clientId: string | null;
};

function validatePatchPropertyBody(input: unknown): ApiResult<PatchPropertyBody> {
  if (typeof input !== "object" || input === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "Body must be an object"
    };
  }

  const payload = input as Record<string, unknown>;
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const address = typeof payload.address === "string" ? payload.address.trim() : "";
  const city = typeof payload.city === "string" ? payload.city.trim() : "";
  const countryCode = typeof payload.countryCode === "string" ? payload.countryCode.trim().toUpperCase() : "";
  const managementContext = payload.managementContext === "owned" || payload.managementContext === "managed"
    ? payload.managementContext
    : null;
  const clientId = typeof payload.clientId === "string"
    ? payload.clientId.trim() || null
    : payload.clientId === null || payload.clientId === undefined
    ? null
    : null;

  if (!name || !address || !city || !countryCode || managementContext === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "name, address, city, countryCode, managementContext are required"
    };
  }

  if (countryCode.length !== 2) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "countryCode must be a 2-letter ISO code"
    };
  }

  return {
    success: true,
    data: {
      name,
      address,
      city,
      countryCode,
      managementContext,
      clientId
    }
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const access = requireOperatorSession(await extractAuthSessionFromCookies());

  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const repositoryResult = createRepositoryFromEnv();
  if (!repositoryResult.success) {
    return jsonResponse(500, repositoryResult);
  }

  try {
    const property = await repositoryResult.data.getPropertyById(id, access.data.organizationId);

    if (!property) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Property not found"
      });
    }

    const scoped = await getScopedPortfolioData(access.data);
    if (!scoped.propertyIds.has(property.id)) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Property not found"
      });
    }

    return jsonResponse(200, {
      success: true,
      data: property
    });
  } catch (error) {
    console.error("Failed to fetch property", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to fetch property"
    });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const access = requireOperatorSession(await extractAuthSessionFromCookies());

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
      error: "Body must be valid JSON"
    });
  }

  const parsed = validatePatchPropertyBody(body);
  if (!parsed.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(parsed.code), parsed);
  }

  if (!isScopeAllowedForSession(access.data, parsed.data.managementContext)) {
    return jsonResponse(403, {
      success: false,
      code: "FORBIDDEN",
      error: "Management context not allowed for current operator"
    });
  }

  if (parsed.data.managementContext === "owned" && parsed.data.clientId) {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: "Owned properties cannot be linked to a client"
    });
  }

  const repositoryResult = createRepositoryFromEnv();
  if (!repositoryResult.success) {
    return jsonResponse(500, repositoryResult);
  }

  try {
    const scoped = await getScopedPortfolioData(access.data);
    if (!scoped.propertyIds.has(id)) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Property not found"
      });
    }

    let clientId: string | null = null;
    let clientName: string | null = null;
    let ownerType: "organization" | "client" = "organization";

    if (parsed.data.clientId) {
      const ownerClient = await repositoryResult.data.getOwnerClientById(
        parsed.data.clientId,
        access.data.organizationId
      );

      if (!ownerClient) {
        return jsonResponse(404, {
          success: false,
          code: "NOT_FOUND",
          error: "Client not found"
        });
      }

      clientId = ownerClient.id;
      clientName = ownerClient.name;
      ownerType = "client";
    } else {
      const owners = await repositoryResult.data.listOwners(access.data.organizationId);
      const organizationOwner = owners.find((owner) => owner.ownerType === "organization");

      if (!organizationOwner) {
        return jsonResponse(500, {
          success: false,
          code: "INTERNAL_ERROR",
          error: "Organization owner not found"
        });
      }

      clientId = organizationOwner.id;
      clientName = organizationOwner.name;
    }

    const property = await repositoryResult.data.updateProperty({
      id,
      organizationId: access.data.organizationId,
      name: parsed.data.name,
      address: parsed.data.address,
      city: parsed.data.city,
      countryCode: parsed.data.countryCode,
      ownerId: clientId,
      ownerName: clientName ?? parsed.data.name,
      ownerType
    });

    if (!property) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Property not found"
      });
    }

    return jsonResponse(200, {
      success: true,
      data: property
    });
  } catch (error) {
    console.error("Failed to update property", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to update property"
    });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const access = requireOperatorSession(await extractAuthSessionFromCookies());

  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const repositoryResult = createRepositoryFromEnv();
  if (!repositoryResult.success) {
    return jsonResponse(500, repositoryResult);
  }

  try {
    const scoped = await getScopedPortfolioData(access.data);
    if (!scoped.propertyIds.has(id)) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Property not found"
      });
    }

    const deleted = await repositoryResult.data.deleteProperty(id, access.data.organizationId);

    if (!deleted) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Property not found"
      });
    }

    return jsonResponse(200, {
      success: true,
      data: { deleted: true }
    });
  } catch (error) {
    console.error("Failed to delete property", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to delete property"
    });
  }
}
