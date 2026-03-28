export type PropertyPurpose = "rent" | "sale";

export type ListingIntentStatus = "draft" | "submitted" | "approved" | "rejected";

export type ListingIntentDraft = {
  id: string;
  title: string;
  purpose: PropertyPurpose;
  priceUsd: number;
  location: string;
  status: ListingIntentStatus;
  createdByUserId: string;
};

export type ListingIntentDraftInput = {
  id: string;
  title: string;
  purpose: PropertyPurpose;
  priceUsd: number;
  location: string;
  createdByUserId: string;
};

export type DomainResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string };
