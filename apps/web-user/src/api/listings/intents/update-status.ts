import {
  createListingIntentRepositoryFromEnv,
  type DatabaseEnvSource,
  type ListingIntentRepository
} from "@hhousing/data-access";
import type {
  ApiResult,
  AuthSession,
  ListingIntentStatus,
  UpdateListingIntentStatusOutput,
  UserRole
} from "@hhousing/api-contracts";
import { transitionListingIntentStatus } from "@hhousing/domain";

const CREATOR_ROLES: readonly UserRole[] = ["manager", "owner", "admin"];
const REVIEW_ROLES: readonly UserRole[] = ["manager", "admin"];

export interface UpdateListingIntentStatusRequest {
  id: string;
  session: AuthSession | null;
  status: ListingIntentStatus;
}

export interface UpdateListingIntentStatusResponse {
  status: number;
  body: ApiResult<UpdateListingIntentStatusOutput>;
}

export interface UpdateListingIntentStatusDeps {
  repository: ListingIntentRepository;
  env: DatabaseEnvSource;
}

function canCreate(role: UserRole): boolean {
  return CREATOR_ROLES.includes(role);
}

function canReview(role: UserRole): boolean {
  return REVIEW_ROLES.includes(role);
}

function mapStatus(result: ApiResult<UpdateListingIntentStatusOutput>): number {
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

export async function updateListingIntentStatus(
  request: UpdateListingIntentStatusRequest,
  deps?: Partial<UpdateListingIntentStatusDeps>
): Promise<UpdateListingIntentStatusResponse> {
  if (request.session === null) {
    const body: ApiResult<UpdateListingIntentStatusOutput> = {
      success: false,
      code: "UNAUTHORIZED",
      error: "Authentication required"
    };

    return { status: 401, body };
  }

  const repositoryResult = deps?.repository
    ? { success: true as const, data: deps.repository }
    : createListingIntentRepositoryFromEnv(deps?.env ?? process.env);

  if (!repositoryResult.success) {
    const body: ApiResult<UpdateListingIntentStatusOutput> = repositoryResult;
    return { status: mapStatus(body), body };
  }

  const current = await repositoryResult.data.getById(request.id);
  if (current === null) {
    const body: ApiResult<UpdateListingIntentStatusOutput> = {
      success: false,
      code: "NOT_FOUND",
      error: "Listing intent not found"
    };

    return { status: 404, body };
  }

  const isReviewer = canReview(request.session.role);
  const isCreator = current.createdByUserId === request.session.userId && canCreate(request.session.role);

  if (request.status === "submitted" && !isCreator) {
    const body: ApiResult<UpdateListingIntentStatusOutput> = {
      success: false,
      code: "FORBIDDEN",
      error: "Only listing owner can submit for review"
    };

    return { status: 403, body };
  }

  if ((request.status === "approved" || request.status === "rejected") && !isReviewer) {
    const body: ApiResult<UpdateListingIntentStatusOutput> = {
      success: false,
      code: "FORBIDDEN",
      error: "Only manager or admin can approve/reject"
    };

    return { status: 403, body };
  }

  const transitionResult = transitionListingIntentStatus(current.status, request.status);
  if (!transitionResult.ok) {
    const body: ApiResult<UpdateListingIntentStatusOutput> = {
      success: false,
      code: "VALIDATION_ERROR",
      error: transitionResult.reason
    };

    return { status: 422, body };
  }

  const updated = await repositoryResult.data.updateStatus(request.id, transitionResult.value);
  if (updated === null) {
    const body: ApiResult<UpdateListingIntentStatusOutput> = {
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
        listing: updated
      }
    }
  };
}
