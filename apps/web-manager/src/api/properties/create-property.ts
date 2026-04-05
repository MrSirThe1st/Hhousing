import type {
  ApiResult,
  AuthSession,
  CreatePropertyOutput
} from "@hhousing/api-contracts";
import { parseCreatePropertyInput } from "@hhousing/api-contracts";
import type { OrganizationPropertyUnitRepository } from "@hhousing/data-access";
import { isScopeAllowedForSession } from "../../lib/operator-context";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../shared";

export interface CreatePropertyRequest {
  body: unknown;
  session: AuthSession | null;
}

export interface CreatePropertyResponse {
  status: number;
  body: ApiResult<CreatePropertyOutput>;
}

export interface CreatePropertyDeps {
  repository: OrganizationPropertyUnitRepository;
  createId: (prefix: string) => string;
}

function buildUnitNumber(propertyName: string, index: number, propertyType: "single_unit" | "multi_unit"): string {
  if (propertyType === "single_unit") {
    return propertyName.trim();
  }

  return `${propertyName.trim()} - Unite ${index + 1}`;
}

export async function createProperty(
  request: CreatePropertyRequest,
  deps: CreatePropertyDeps
): Promise<CreatePropertyResponse> {
  const sessionResult = requireOperatorSession(request.session);
  if (!sessionResult.success) {
    return {
      status: mapErrorCodeToHttpStatus(sessionResult.code),
      body: sessionResult
    };
  }

  const parsed = parseCreatePropertyInput(request.body);
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

  if (!isScopeAllowedForSession(sessionResult.data, parsed.data.managementContext)) {
    return {
      status: 403,
      body: {
        success: false,
        code: "FORBIDDEN",
        error: "Management context not allowed for current operator"
      }
    };
  }

  if (parsed.data.managementContext === "owned" && parsed.data.clientId) {
    return {
      status: 400,
      body: {
        success: false,
        code: "VALIDATION_ERROR",
        error: "Owned properties cannot be linked to a client"
      }
    };
  }

  let clientId: string | null = null;
  let clientName: string | null = null;

  if (parsed.data.clientId) {
    const ownerClient = await deps.repository.getOwnerClientById(
      parsed.data.clientId,
      sessionResult.data.organizationId
    );

    if (!ownerClient) {
      return {
        status: 404,
        body: {
          success: false,
          code: "NOT_FOUND",
          error: "Client not found"
        }
      };
    }

    clientId = ownerClient.id;
    clientName = ownerClient.name;
  }

  const propertyId = deps.createId("prp");
  const unitCount = parsed.data.propertyType === "multi_unit"
    ? parsed.data.unitTemplate?.unitCount ?? 1
    : 1;

  const createResult = await deps.repository.createPropertyWithUnits({
    property: {
      id: propertyId,
      organizationId: parsed.data.organizationId,
      name: parsed.data.name,
      address: parsed.data.address,
      city: parsed.data.city,
      countryCode: parsed.data.countryCode,
      managementContext: parsed.data.managementContext,
      propertyType: parsed.data.propertyType,
      yearBuilt: parsed.data.yearBuilt ?? null,
      photoUrls: parsed.data.photoUrls ?? [],
      clientId,
      clientName
    },
    units: Array.from({ length: unitCount }, (_, index) => ({
      id: deps.createId("unt"),
      organizationId: parsed.data.organizationId,
      propertyId,
      unitNumber: buildUnitNumber(parsed.data.name, index, parsed.data.propertyType),
      monthlyRentAmount: parsed.data.unitTemplate!.monthlyRentAmount,
      depositAmount: parsed.data.unitTemplate!.depositAmount,
      currencyCode: parsed.data.unitTemplate!.currencyCode,
      bedroomCount: parsed.data.unitTemplate!.bedroomCount ?? null,
      bathroomCount: parsed.data.unitTemplate!.bathroomCount ?? null,
      sizeSqm: parsed.data.unitTemplate!.sizeSqm ?? null,
      amenities: parsed.data.unitTemplate!.amenities ?? [],
      features: parsed.data.unitTemplate!.features ?? []
    }))
  });

  return {
    status: 201,
    body: {
      success: true,
      data: {
        property: createResult.property,
        units: createResult.units
      }
    }
  };
}
