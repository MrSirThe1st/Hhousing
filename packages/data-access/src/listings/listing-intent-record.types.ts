import type { ListingIntentDraft, ListingIntentStatus, PropertyPurpose } from "@hhousing/domain";

export interface ListingIntentRecord {
  id: string;
  title: string;
  purpose: PropertyPurpose;
  priceUsd: number;
  location: string;
  status: ListingIntentStatus;
  createdByUserId: string;
  createdAtIso: string;
}

export interface ListingIntentRepository {
  create(draft: ListingIntentDraft): Promise<ListingIntentRecord>;
  getById(id: string): Promise<ListingIntentRecord | null>;
  listByCreatedByUserId(userId: string): Promise<ListingIntentRecord[]>;
  listAll(): Promise<ListingIntentRecord[]>;
  updateStatus(id: string, status: ListingIntentStatus): Promise<ListingIntentRecord | null>;
}

export interface InMemoryListingIntentRepositoryState {
  records: Map<string, ListingIntentRecord>;
}
