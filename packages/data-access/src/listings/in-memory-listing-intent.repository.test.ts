import { describe, expect, it } from "vitest";
import { createInMemoryListingIntentRepository } from "./in-memory-listing-intent.repository.js";

describe("createInMemoryListingIntentRepository", () => {
  it("stores and returns listing intent records", async () => {
    const repository = createInMemoryListingIntentRepository({
      now: () => "2026-03-28T00:00:00.000Z"
    });

    const created = await repository.create({
      id: "lst_1",
      title: "Gombe flat",
      purpose: "rent",
      priceUsd: 1200,
      location: "Kinshasa",
      status: "draft",
      createdByUserId: "usr_1"
    });

    const loaded = await repository.getById("lst_1");

    expect(created.createdAtIso).toBe("2026-03-28T00:00:00.000Z");
    expect(loaded).toEqual(created);
  });

  it("lists only records for the selected creator", async () => {
    const repository = createInMemoryListingIntentRepository({
      now: () => "2026-03-28T00:00:00.000Z"
    });

    await repository.create({
      id: "lst_1",
      title: "Gombe flat",
      purpose: "rent",
      priceUsd: 1200,
      location: "Kinshasa",
      status: "draft",
      createdByUserId: "usr_1"
    });

    await repository.create({
      id: "lst_2",
      title: "Matadi flat",
      purpose: "rent",
      priceUsd: 600,
      location: "Matadi",
      status: "draft",
      createdByUserId: "usr_2"
    });

    const userItems = await repository.listByCreatedByUserId("usr_1");

    expect(userItems).toHaveLength(1);
    expect(userItems[0]?.id).toBe("lst_1");
  });
});
