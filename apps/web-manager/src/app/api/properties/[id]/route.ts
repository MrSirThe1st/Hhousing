import { extractAuthSessionFromCookies } from "../../../../auth/session-adapter";
import { createRepositoryFromEnv, jsonResponse, parseJsonBody } from "../../shared";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const session = await extractAuthSessionFromCookies();

  if (!session) {
    return jsonResponse(401, {
      success: false,
      code: "UNAUTHORIZED",
      error: "Authentication required"
    });
  }

  const repositoryResult = createRepositoryFromEnv();
  if (!repositoryResult.success) {
    return jsonResponse(500, repositoryResult);
  }

  try {
    const property = await repositoryResult.data.getPropertyById(id, session.organizationId);

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
  const session = await extractAuthSessionFromCookies();

  if (!session) {
    return jsonResponse(401, {
      success: false,
      code: "UNAUTHORIZED",
      error: "Authentication required"
    });
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

  const repositoryResult = createRepositoryFromEnv();
  if (!repositoryResult.success) {
    return jsonResponse(500, repositoryResult);
  }

  const payload = body as Record<string, unknown>;
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const address = typeof payload.address === "string" ? payload.address.trim() : "";
  const city = typeof payload.city === "string" ? payload.city.trim() : "";
  const countryCode = typeof payload.countryCode === "string" ? payload.countryCode.trim() : "";

  if (!name || !address || !city || !countryCode) {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: "name, address, city, countryCode are required"
    });
  }

  try {
    const property = await repositoryResult.data.updateProperty({
      id,
      organizationId: session.organizationId,
      name,
      address,
      city,
      countryCode
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
  const session = await extractAuthSessionFromCookies();

  if (!session) {
    return jsonResponse(401, {
      success: false,
      code: "UNAUTHORIZED",
      error: "Authentication required"
    });
  }

  const repositoryResult = createRepositoryFromEnv();
  if (!repositoryResult.success) {
    return jsonResponse(500, repositoryResult);
  }

  try {
    const deleted = await repositoryResult.data.deleteProperty(id, session.organizationId);

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
