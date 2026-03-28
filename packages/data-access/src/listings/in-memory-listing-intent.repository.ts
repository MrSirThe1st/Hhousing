import type { ListingIntentDraft } from "@hhousing/domain";
import type {
  InMemoryListingIntentRepositoryState,
  ListingIntentRecord,
  ListingIntentRepository
} from "./listing-intent-record.types.js";

export interface CreateInMemoryListingIntentRepositoryOptions {
  now: () => string;
}

export function createInMemoryListingIntentRepository(
  options?: CreateInMemoryListingIntentRepositoryOptions
): ListingIntentRepository {
  const state: InMemoryListingIntentRepositoryState = {
    records: new Map<string, ListingIntentRecord>()
  };

  const now = options?.now ?? (() => new Date().toISOString());

  return {
    async create(draft: ListingIntentDraft): Promise<ListingIntentRecord> {
      const record: ListingIntentRecord = {
        id: draft.id,
        title: draft.title,
        purpose: draft.purpose,
        priceUsd: draft.priceUsd,
        location: draft.location,
        status: draft.status,
        createdByUserId: draft.createdByUserId,
        createdAtIso: now()
      };

      state.records.set(record.id, record);
      return record;
    },
    async getById(id: string): Promise<ListingIntentRecord | null> {
      return state.records.get(id) ?? null;
    },
    async listByCreatedByUserId(userId: string): Promise<ListingIntentRecord[]> {
      return [...state.records.values()]
        .filter((record) => record.createdByUserId === userId)
        .sort((left, right) => right.createdAtIso.localeCompare(left.createdAtIso));
    },
    async listAll(): Promise<ListingIntentRecord[]> {
      return [...state.records.values()].sort((left, right) =>
        right.createdAtIso.localeCompare(left.createdAtIso)
      );
    },
    async updateStatus(id: string, status: ListingIntentRecord["status"]): Promise<ListingIntentRecord | null> {
      const existing = state.records.get(id);
      if (!existing) {
        return null;
      }

      const updated: ListingIntentRecord = {
        ...existing,
        status
      };

      state.records.set(id, updated);
      return updated;
    }
  };
}
