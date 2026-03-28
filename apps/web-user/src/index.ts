import { getListingLabel } from "@hhousing/domain";

export function buildMarketplaceHeading(): string {
  return `Hhousing - ${getListingLabel("rent")}`;
}

export { createListingIntent } from "./listings/create-listing-intent";
export type { CreateListingIntentDeps } from "./listings/create-listing-intent";
export { postCreateListingIntent } from "./api/listings/intents/post";
export { createPostListingIntentRoute } from "./app/api/listings/intents/route-handler";
export { extractAuthSessionFromRequest } from "./auth/session-adapter";
export { readSupabasePublicEnv } from "./config/supabase-env";
export type {
  PostCreateListingIntentDeps,
  PostCreateListingIntentRequest,
  PostCreateListingIntentResponse
} from "./api/listings/intents/post";
export type {
  CreatePostListingIntentRouteDeps,
  RoutePostHandler,
  RouteSessionExtractor
} from "./app/api/listings/intents/route-handler";
export type {
  SupabasePublicEnv,
  SupabasePublicEnvSource
} from "./config/supabase-env";
