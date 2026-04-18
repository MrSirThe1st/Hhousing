import type {
  ApiResult,
  AuthSession,
  CreateUnitOutput
} from "@hhousing/api-contracts";
import { parseCreateUnitInput } from "@hhousing/api-contracts";
import type { OrganizationPropertyUnitRepository } from "@hhousing/data-access";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../shared";
import { logOperatorAuditEvent } from "../audit-log";

export interface CreateUnitRequest {
  body: unknown;
  session: AuthSession | null;
}

export interface CreateUnitResponse {
  status: number;
  body: ApiResult<CreateUnitOutput>;
}

export interface CreateUnitDeps {
  repository: OrganizationPropertyUnitRepository;
  createId: () => string;
}

export async function createUnit(
  request: CreateUnitRequest,
  deps: CreateUnitDeps
): Promise<CreateUnitResponse> {
  const sessionResult = requireOperatorSession(request.session);
  if (!sessionResult.success) {
    return {
      status: mapErrorCodeToHttpStatus(sessionResult.code),
      body: sessionResult
    };
  }

  const parsed = parseCreateUnitInput(request.body);
  if (!parsed.success) {
    return {
      status: mapErrorCodeToHttpStatus(parsed.code),
      body: parsed
    };
  }

  if (parsed.data.organizationId !== sessionResult.data.organizationId) {
    return {
      status: 403,
      body: {
        success: false,
        code: "FORBIDDEN",
        error: "Organization mismatch"
      }
    };
  }

  const property = await deps.repository.getPropertyById(
    parsed.data.propertyId,
    sessionResult.data.organizationId
  );

  if (!property) {
    return {
      status: 404,
      body: {
        success: false,
        code: "NOT_FOUND",
        error: "Property not found"
      }
    };
  }

  if (property.propertyType === "single_unit") {
    const propertyEntries = await deps.repository.listPropertiesWithUnits(
      sessionResult.data.organizationId,
      property.managementContext
    );
    const matchingProperty = propertyEntries.find((entry) => entry.property.id === property.id);

    if ((matchingProperty?.units.length ?? 0) > 0) {
      return {
        status: 400,
        body: {
          success: false,
          code: "VALIDATION_ERROR",
          error: "Single-unit properties cannot have more than one unit"
        }
      };
    }
  }

  let unit;

  try {
    unit = await deps.repository.createUnit({
      id: deps.createId(),
      organizationId: parsed.data.organizationId,
      propertyId: parsed.data.propertyId,
      unitNumber: parsed.data.unitNumber,
      monthlyRentAmount: parsed.data.monthlyRentAmount,
      depositAmount: parsed.data.depositAmount ?? 0,
      currencyCode: parsed.data.currencyCode,
      bedroomCount: parsed.data.bedroomCount ?? null,
      bathroomCount: parsed.data.bathroomCount ?? null,
      sizeSqm: parsed.data.sizeSqm ?? null,
      amenities: parsed.data.amenities ?? [],
      features: parsed.data.features ?? []
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("SINGLE_UNIT_PROPERTY_ALREADY_HAS_UNIT")) {
      return {
        status: 400,
        body: {
          success: false,
          code: "VALIDATION_ERROR",
          error: "Single-unit properties cannot have more than one unit"
        }
      };
    }

    throw error;
  }

  await logOperatorAuditEvent({
    session: sessionResult.data,
    actionKey: "operations.unit.created",
    entityType: "unit",
    entityId: unit.id,
    metadata: {
      propertyId: unit.propertyId,
      unitNumber: unit.unitNumber,
      monthlyRentAmount: unit.monthlyRentAmount,
      currencyCode: unit.currencyCode
    }
  });

  return {
    status: 201,
    body: {
      success: true,
      data: {
        unit
      }
    }
  };
}
