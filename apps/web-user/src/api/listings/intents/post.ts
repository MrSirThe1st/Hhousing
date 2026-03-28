import {
  createListingIntentRepositoryFromEnv,
  type DatabaseEnvSource,
  type ListingIntentRepository
} from "@hhousing/data-access";
import type { ApiResult, AuthSession, CreateListingIntentOutput } from "@hhousing/api-contracts";
import { createListingIntent } from "../../../listings/create-listing-intent.service";

export interface PostCreateListingIntentRequest {
  body: unknown;
  session: AuthSession | null;
}

export interface PostCreateListingIntentResponse {
  status: number;
  body: ApiResult<CreateListingIntentOutput>;
}

export interface PostCreateListingIntentDeps {
  createId: () => string;
  repository: ListingIntentRepository;
  env: DatabaseEnvSource;
}

function mapResultToStatus(result: ApiResult<CreateListingIntentOutput>): number {
  if (result.success) {
    return 201;
  }

  if (result.code === "UNAUTHORIZED") {
    return 401;
  }

  if (result.code === "FORBIDDEN") {
    return 403;
  }

  if (result.code === "VALIDATION_ERROR") {
    return 400;
  }

  if (result.code === "CONFIG_ERROR") {
    return 500;
  }

  return 422;
}

export async function postCreateListingIntent(
  request: PostCreateListingIntentRequest,
  deps?: Partial<PostCreateListingIntentDeps>
): Promise<PostCreateListingIntentResponse> {
  const repositoryResult = deps?.repository
    ? { success: true as const, data: deps.repository }
    : createListingIntentRepositoryFromEnv(deps?.env ?? process.env);

  if (!repositoryResult.success) {
    return {
      status: mapResultToStatus(repositoryResult),
      body: repositoryResult
    };
  }

  const createId = deps?.createId ?? (() => `lst_${Date.now()}`);

  const result = await createListingIntent(request.body, request.session, {
    repository: repositoryResult.data,
    createId
  });

  return {
    status: mapResultToStatus(result),
    body: result
  };
}
