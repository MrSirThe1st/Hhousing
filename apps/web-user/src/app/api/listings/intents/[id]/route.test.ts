import { describe, expect, it } from "vitest";
import { createInMemoryListingIntentRepository } from "@hhousing/data-access";
import { createGetListingIntentByIdRoute } from "./route-handler";

describe("GET /api/listings/intents/[id] route", () => {
  it("returns 200 for owned intent", async () => {
    const repository = createInMemoryListingIntentRepository();

    await repository.create({
      id: "lst_1",
      title: "Appartement moderne",
      purpose: "rent",
      priceUsd: 1800,
      location: "Kinshasa",
      status: "draft",
      createdByUserId: "usr_manager_1"
    });

    const get = createGetListingIntentByIdRoute({
      repository,
      extractSession: async () => ({
        userId: "usr_manager_1",
        role: "manager"
      })
    });

    const response = await get(
      new Request("http://localhost/api/listings/intents/lst_1", {
        method: "GET"
      }),
      {
        params: Promise.resolve({ id: "lst_1" })
      }
    );

    expect(response.status).toBe(200);
  });

  it("returns 404 for non-owned intent when requester is not reviewer", async () => {
    const repository = createInMemoryListingIntentRepository();

    await repository.create({
      id: "lst_1",
      title: "Appartement moderne",
      purpose: "rent",
      priceUsd: 1800,
      location: "Kinshasa",
      status: "draft",
      createdByUserId: "usr_other"
    });

    const get = createGetListingIntentByIdRoute({
      repository,
      extractSession: async () => ({
        userId: "usr_owner_1",
        role: "owner"
      })
    });

    const response = await get(
      new Request("http://localhost/api/listings/intents/lst_1", {
        method: "GET"
      }),
      {
        params: Promise.resolve({ id: "lst_1" })
      }
    );

    expect(response.status).toBe(404);
  });

  it("returns 200 for non-owned intent when requester is manager", async () => {
    const repository = createInMemoryListingIntentRepository();

    await repository.create({
      id: "lst_1",
      title: "Appartement moderne",
      purpose: "rent",
      priceUsd: 1800,
      location: "Kinshasa",
      status: "draft",
      createdByUserId: "usr_other"
    });

    const get = createGetListingIntentByIdRoute({
      repository,
      extractSession: async () => ({
        userId: "usr_manager_1",
        role: "manager"
      })
    });

    const response = await get(
      new Request("http://localhost/api/listings/intents/lst_1", {
        method: "GET"
      }),
      {
        params: Promise.resolve({ id: "lst_1" })
      }
    );

    expect(response.status).toBe(200);
  });
});
