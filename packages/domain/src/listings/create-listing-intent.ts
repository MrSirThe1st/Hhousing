import type { DomainResult, ListingIntentDraft, ListingIntentDraftInput } from "./listing-intent.types.js";

function hasMinLength(value: string, minLength: number): boolean {
  return value.trim().length >= minLength;
}

export function createListingIntentDraft(input: ListingIntentDraftInput): DomainResult<ListingIntentDraft> {
  if (!hasMinLength(input.id, 5)) {
    return {
      ok: false,
      reason: "listing id is invalid"
    };
  }

  if (!hasMinLength(input.title, 3)) {
    return {
      ok: false,
      reason: "title must have at least 3 characters"
    };
  }

  if (!hasMinLength(input.location, 2)) {
    return {
      ok: false,
      reason: "location must have at least 2 characters"
    };
  }

  if (!Number.isFinite(input.priceUsd) || input.priceUsd <= 0) {
    return {
      ok: false,
      reason: "price must be positive"
    };
  }

  if (!hasMinLength(input.createdByUserId, 3)) {
    return {
      ok: false,
      reason: "creator id is invalid"
    };
  }

  return {
    ok: true,
    value: {
      id: input.id,
      title: input.title.trim(),
      purpose: input.purpose,
      priceUsd: input.priceUsd,
      location: input.location.trim(),
      status: "draft",
      createdByUserId: input.createdByUserId.trim()
    }
  };
}
