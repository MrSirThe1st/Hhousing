import { Permission, type ApiResult } from "@hhousing/api-contracts";
import { logOperatorAuditEvent } from "../../../../api/audit-log";
import { extractAuthSessionFromCookies } from "../../../../auth/session-adapter";
import { getScopedPortfolioData } from "../../../../lib/operator-scope-portfolio";
import { requirePermission } from "../../../../api/organizations/permissions";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../../../../api/shared";
import { createRepositoryFromEnv, createTeamFunctionsRepo, jsonResponse, parseJsonBody } from "../../shared";

type PatchPropertyBody = {
  name: string;
  address: string;
  city: string;
  countryCode: string;
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
  const clientId = typeof payload.clientId === "string"
    ? payload.clientId.trim() || null
    : payload.clientId === null || payload.clientId === undefined
    ? null
    : null;

  if (!name || !address || !city || !countryCode) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "name, address, city, countryCode are required"
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

  const permissionResult = await requirePermission(
    access.data,
    Permission.VIEW_PROPERTIES,
    createTeamFunctionsRepo()
  );
  if (!permissionResult.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(permissionResult.code), permissionResult);
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

  const parsed = validatePatchPropertyBody(body);
  if (!parsed.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(parsed.code), parsed);
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

    await logOperatorAuditEvent({
      organizationId: access.data.organizationId,
      actorMemberId: access.data.memberships.find((membership) => membership.organizationId === access.data.organizationId)?.id ?? null,
      actionKey: "operations.property.updated",
      entityType: "property",
      entityId: property.id,
      metadata: {
        city: property.city,
        countryCode: property.countryCode,
        ownerType: property.ownerType
      }
    });

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

  const permissionResult = await requirePermission(
    access.data,
    Permission.MANAGE_PROPERTIES,
    createTeamFunctionsRepo()
  );
  if (!permissionResult.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(permissionResult.code), permissionResult);
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

    await logOperatorAuditEvent({
      organizationId: access.data.organizationId,
      actorMemberId: access.data.memberships.find((membership) => membership.organizationId === access.data.organizationId)?.id ?? null,
      actionKey: "operations.property.deleted",
      entityType: "property",
      entityId: id,
      metadata: {}
    });

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
