import { describe, expect, it } from "vitest";
import { createInMemoryListingIntentRepository } from "@hhousing/data-access";
import { getListingIntentById } from "./get-by-id";

describe("getListingIntentById", () => {
  it("returns record for owner session", async () => {
    const repository = createInMemoryListingIntentRepository();

    await repository.create({
      id: "lst_1",
      title: "Gombe flat",
      purpose: "rent",
      priceUsd: 1400,
      location: "Kinshasa",
      status: "draft",
      createdByUserId: "usr_1"
    });

    const response = await getListingIntentById(
      {
        id: "lst_1",
        session: {
          userId: "usr_1",
          role: "manager"
        }
      },
      { repository }
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it("returns 404 for missing record", async () => {
    const response = await getListingIntentById(
      {
        id: "lst_missing",
        session: {
          userId: "usr_1",
          role: "manager"
        }
      },
      { repository: createInMemoryListingIntentRepository() }
    );

    expect(response.status).toBe(404);
  });
});
