import type { DomainResult, ListingIntentStatus } from "./listing-intent.types.js";

const ALLOWED_TRANSITIONS: Readonly<Record<ListingIntentStatus, ReadonlyArray<ListingIntentStatus>>> = {
  draft: ["submitted"],
  submitted: ["approved", "rejected"],
  approved: [],
  rejected: []
};

export function transitionListingIntentStatus(
  current: ListingIntentStatus,
  next: ListingIntentStatus
): DomainResult<ListingIntentStatus> {
  if (current === next) {
    return {
      ok: true,
      value: next
    };
  }

  const allowed = ALLOWED_TRANSITIONS[current];
  if (!allowed.includes(next)) {
    return {
      ok: false,
      reason: `invalid status transition: ${current} -> ${next}`
    };
  }

  return {
    ok: true,
    value: next
  };
}
