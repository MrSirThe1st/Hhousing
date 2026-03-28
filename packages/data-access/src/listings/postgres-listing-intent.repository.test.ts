import { describe, expect, it } from "vitest";
import {
  createListingIntentRepositoryFromEnv,
  createPostgresListingIntentRepository,
  type DatabaseQueryable
} from "./postgres-listing-intent.repository.js";

describe("createPostgresListingIntentRepository", () => {
  it("maps inserted row to record", async () => {
    const queries: Array<{ text: string; values?: readonly unknown[] }> = [];

    const client: DatabaseQueryable = {
      async query<Row>(text: string, values?: readonly unknown[]) {
        queries.push({ text, values });
        return {
          rows: [
            {
              id: "lst_1",
              title: "Gombe flat",
              purpose: "rent",
              price_usd: 1300,
              location: "Kinshasa",
              status: "draft",
              created_by_user_id: "usr_1",
              created_at: "2026-03-28T00:00:00.000Z"
            }
          ] as Row[]
        };
      }
    };

    const repository = createPostgresListingIntentRepository(client);
    const record = await repository.create({
      id: "lst_1",
      title: "Gombe flat",
      purpose: "rent",
      priceUsd: 1300,
      location: "Kinshasa",
      status: "draft",
      createdByUserId: "usr_1"
    });

    expect(queries[0]?.text).toContain("insert into listing_intents");
    expect(record).toEqual({
      id: "lst_1",
      title: "Gombe flat",
      purpose: "rent",
      priceUsd: 1300,
      location: "Kinshasa",
      status: "draft",
      createdByUserId: "usr_1",
      createdAtIso: "2026-03-28T00:00:00.000Z"
    });
  });

  it("maps list query rows", async () => {
    const client: DatabaseQueryable = {
      async query<Row>(text: string) {
        if (text.includes("where created_by_user_id = $1")) {
          return {
            rows: [
              {
                id: "lst_1",
                title: "Gombe flat",
                purpose: "rent",
                price_usd: 1300,
                location: "Kinshasa",
                status: "draft",
                created_by_user_id: "usr_1",
                created_at: "2026-03-28T00:00:00.000Z"
              }
            ] as Row[]
          };
        }

        return { rows: [] as Row[] };
      }
    };

    const repository = createPostgresListingIntentRepository(client);
    const items = await repository.listByCreatedByUserId("usr_1");

    expect(items).toHaveLength(1);
    expect(items[0]?.createdByUserId).toBe("usr_1");
  });

  it("returns config error when DATABASE_URL is missing", () => {
    const result = createListingIntentRepositoryFromEnv({});

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.code).toBe("CONFIG_ERROR");
  });
});
