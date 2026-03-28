export type PropertyPurpose = "rent" | "sale";

export function getListingLabel(purpose: PropertyPurpose): string {
  if (purpose === "rent") {
    return "For Rent";
  }

  return "For Sale";
}

export { createListingIntentDraft } from "./listings/create-listing-intent.js";
export { transitionListingIntentStatus } from "./listings/transition-listing-intent-status.js";
export type {
  DomainResult,
  ListingIntentDraft,
  ListingIntentDraftInput,
  ListingIntentStatus
} from "./listings/listing-intent.types.js";
