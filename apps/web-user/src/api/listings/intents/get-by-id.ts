import {
  createListingIntentRepositoryFromEnv,
  type DatabaseEnvSource,
  type ListingIntentRepository
} from "@hhousing/data-access";
import type {
  ApiResult,
  AuthSession,
  GetListingIntentByIdOutput,
  UserRole
} from "@hhousing/api-contracts";

const ALLOWED_ROLES: readonly UserRole[] = ["manager", "owner", "admin"];

export interface GetListingIntentByIdRequest {
  id: string;
  session: AuthSession | null;
}

export interface GetListingIntentByIdResponse {
  status: number;
  body: ApiResult<GetListingIntentByIdOutput>;
}

export interface GetListingIntentByIdDeps {
  repository: ListingIntentRepository;
  env: DatabaseEnvSource;
}

function canRead(role: UserRole): boolean {
  return ALLOWED_ROLES.includes(role);
}

function mapStatus(result: ApiResult<GetListingIntentByIdOutput>): number {
  if (result.success) {
    return 200;
  }

  if (result.code === "UNAUTHORIZED") {
    return 401;
  }

  if (result.code === "FORBIDDEN") {
    return 403;
  }

  if (result.code === "NOT_FOUND") {
    return 404;
  }

  if (result.code === "CONFIG_ERROR") {
    return 500;
  }

  return 422;
}

export async function getListingIntentById(
  request: GetListingIntentByIdRequest,
  deps?: Partial<GetListingIntentByIdDeps>
): Promise<GetListingIntentByIdResponse> {
  if (request.session === null) {
    const body: ApiResult<GetListingIntentByIdOutput> = {
      success: false,
      code: "UNAUTHORIZED",
      error: "Authentication required"
    };

    return { status: 401, body };
  }

  if (!canRead(request.session.role)) {
    const body: ApiResult<GetListingIntentByIdOutput> = {
      success: false,
      code: "FORBIDDEN",
      error: "Role cannot read listing intents"
    };

    return { status: 403, body };
  }

  const repositoryResult = deps?.repository
    ? { success: true as const, data: deps.repository }
    : createListingIntentRepositoryFromEnv(deps?.env ?? process.env);

  if (!repositoryResult.success) {
    const body: ApiResult<GetListingIntentByIdOutput> = repositoryResult;
    return {
      status: mapStatus(body),
      body
    };
  }

  const item = await repositoryResult.data.getById(request.id);
  if (item === null) {
    const body: ApiResult<GetListingIntentByIdOutput> = {
      success: false,
      code: "NOT_FOUND",
      error: "Listing intent not found"
    };

    return { status: 404, body };
  }

  const isReviewer = request.session.role === "manager" || request.session.role === "admin";
  const isOwner = item.createdByUserId === request.session.userId;
  if (!isReviewer && !isOwner) {
    const body: ApiResult<GetListingIntentByIdOutput> = {
      success: false,
      code: "NOT_FOUND",
      error: "Listing intent not found"
    };

    return { status: 404, body };
  }

  return {
    status: 200,
    body: {
      success: true,
      data: {
        listing: item
      }
    }
  };
}
