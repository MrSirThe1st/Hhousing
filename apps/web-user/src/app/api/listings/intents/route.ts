import {
	createGetListingIntentsRoute,
	createPostListingIntentRoute
} from "./route-handler";

export const GET = createGetListingIntentsRoute();
export const POST = createPostListingIntentRoute();
