import type { ApiResult } from "@hhousing/api-contracts";
import { extractAuthSessionFromCookies } from "../../../../auth/session-adapter";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../../../../api/shared";
import { createRepositoryFromEnv, jsonResponse, parseJsonBody } from "../../shared";

type PatchPropertyBody = {
  name: string;
  address: string;
  city: string;
  countryCode: string;
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
      countryCode
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

  const repositoryResult = createRepositoryFromEnv();
  if (!repositoryResult.success) {
    return jsonResponse(500, repositoryResult);
  }

  try {
    const property = await repositoryResult.data.updateProperty({
      id,
      organizationId: access.data.organizationId,
      name: parsed.data.name,
      address: parsed.data.address,
      city: parsed.data.city,
      countryCode: parsed.data.countryCode
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
