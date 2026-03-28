import {
  createListingIntentRepositoryFromEnv,
  type DatabaseEnvSource,
  type ListingIntentRepository
} from "@hhousing/data-access";
import type {
  ApiResult,
  AuthSession,
  ListListingIntentsOutput,
  ListingIntentSort,
  ListingIntentStatus,
  PropertyPurpose,
  UserRole
} from "@hhousing/api-contracts";

const ALLOWED_ROLES: readonly UserRole[] = ["manager", "owner", "admin"];

export interface GetListingIntentsRequest {
  session: AuthSession | null;
  page?: number;
  pageSize?: number;
  scope?: "mine" | "review";
  purpose?: PropertyPurpose;
  status?: ListingIntentStatus;
  locationContains?: string;
  minPriceUsd?: number;
  maxPriceUsd?: number;
  sort?: ListingIntentSort;
}
const REVIEW_ROLES: readonly UserRole[] = ["manager", "admin"];

export interface GetListingIntentsResponse {
  status: number;
  body: ApiResult<ListListingIntentsOutput>;
}

export interface GetListingIntentsDeps {
  repository: ListingIntentRepository;
  env: DatabaseEnvSource;
}

function canRead(role: UserRole): boolean {
  return ALLOWED_ROLES.includes(role);
}

function canReview(role: UserRole): boolean {
  return REVIEW_ROLES.includes(role);
}

function mapStatus(result: ApiResult<ListListingIntentsOutput>): number {
  if (result.success) {
    return 200;
  }

  if (result.code === "UNAUTHORIZED") {
    return 401;
  }

  if (result.code === "FORBIDDEN") {
    return 403;
  }

  if (result.code === "CONFIG_ERROR") {
    return 500;
  }

  return 422;
}

function normalizePage(value: number | undefined): number {
  if (!value || Number.isNaN(value) || value < 1) {
    return 1;
  }

  return Math.floor(value);
}

function normalizePageSize(value: number | undefined): number {
  if (!value || Number.isNaN(value) || value < 1) {
    return 12;
  }

  return Math.min(Math.floor(value), 50);
}

function normalizeTextFilter(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.toLowerCase() : undefined;
}

function sortItems<T extends { priceUsd: number; createdAtIso: string }>(
  items: ReadonlyArray<T>,
  sort: ListingIntentSort
): T[] {
  const sorted = [...items];

  if (sort === "priceAsc") {
    sorted.sort((left, right) => left.priceUsd - right.priceUsd);
    return sorted;
  }

  if (sort === "priceDesc") {
    sorted.sort((left, right) => right.priceUsd - left.priceUsd);
    return sorted;
  }

  sorted.sort((left, right) => right.createdAtIso.localeCompare(left.createdAtIso));
  return sorted;
}

export async function getListingIntents(
  request: GetListingIntentsRequest,
  deps?: Partial<GetListingIntentsDeps>
): Promise<GetListingIntentsResponse> {
  if (request.session === null) {
    const body: ApiResult<ListListingIntentsOutput> = {
      success: false,
      code: "UNAUTHORIZED",
      error: "Authentication required"
    };

    return { status: 401, body };
  }

  if (!canRead(request.session.role)) {
    const body: ApiResult<ListListingIntentsOutput> = {
      success: false,
      code: "FORBIDDEN",
      error: "Role cannot list listing intents"
    };

    return { status: 403, body };
  }

  const scope = request.scope ?? "mine";
  if (scope === "review" && !canReview(request.session.role)) {
    const body: ApiResult<ListListingIntentsOutput> = {
      success: false,
      code: "FORBIDDEN",
      error: "Role cannot access review queue"
    };

    return { status: 403, body };
  }

  const repositoryResult = deps?.repository
    ? { success: true as const, data: deps.repository }
    : createListingIntentRepositoryFromEnv(deps?.env ?? process.env);

  if (!repositoryResult.success) {
    const body: ApiResult<ListListingIntentsOutput> = repositoryResult;
    return {
      status: mapStatus(body),
      body
    };
  }

  const page = normalizePage(request.page);
  const pageSize = normalizePageSize(request.pageSize);
  const locationContains = normalizeTextFilter(request.locationContains);
  const sort = request.sort ?? "latest";

  const allItems =
    scope === "review"
      ? await repositoryResult.data.listAll()
      : await repositoryResult.data.listByCreatedByUserId(request.session.userId);
  const filtered = allItems.filter((item) => {
    if (request.purpose && item.purpose !== request.purpose) {
      return false;
    }

    if (request.status && item.status !== request.status) {
      return false;
    }

    if (locationContains && !item.location.toLowerCase().includes(locationContains)) {
      return false;
    }

    if (typeof request.minPriceUsd === "number" && item.priceUsd < request.minPriceUsd) {
      return false;
    }

    if (typeof request.maxPriceUsd === "number" && item.priceUsd > request.maxPriceUsd) {
      return false;
    }

    return true;
  });

  const sorted = sortItems(filtered, sort);
  const offset = (page - 1) * pageSize;
  const pagedItems = sorted.slice(offset, offset + pageSize);

  return {
    status: 200,
    body: {
      success: true,
      data: {
        items: pagedItems,
        meta: {
          page,
          pageSize,
          total: filtered.length,
          hasNextPage: offset + pageSize < filtered.length
        }
      }
    }
  };
}
