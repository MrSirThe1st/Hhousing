import type { ApiResult } from "./api-result.types.js";

export type PropertyPurpose = "rent" | "sale";

export type ListingIntentStatus = "draft" | "submitted" | "approved" | "rejected";

export type ListingIntentSort = "latest" | "priceAsc" | "priceDesc";

export type CreateListingIntentInput = {
  title: string;
  purpose: PropertyPurpose;
  priceUsd: number;
  location: string;
};

export type CreateListingIntentOutput = {
  listingId: string;
  status: ListingIntentStatus;
};

export type CreateListingIntentValidationResult = ApiResult<CreateListingIntentInput>;

export type ListingIntentView = {
  id: string;
  title: string;
  purpose: PropertyPurpose;
  priceUsd: number;
  location: string;
  status: ListingIntentStatus;
  createdByUserId: string;
  createdAtIso: string;
};

export type GetListingIntentByIdOutput = {
  listing: ListingIntentView;
};

export type UpdateListingIntentStatusInput = {
  status: ListingIntentStatus;
};

export type UpdateListingIntentStatusOutput = {
  listing: ListingIntentView;
};

export type ListListingIntentsMeta = {
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
};

export type ListListingIntentsOutput = {
  items: ListingIntentView[];
  meta: ListListingIntentsMeta;
};
