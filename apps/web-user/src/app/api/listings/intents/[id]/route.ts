import {
	createGetListingIntentByIdRoute,
	createPatchListingIntentStatusRoute
} from "./route-handler";

export const GET = createGetListingIntentByIdRoute();
export const PATCH = createPatchListingIntentStatusRoute();
