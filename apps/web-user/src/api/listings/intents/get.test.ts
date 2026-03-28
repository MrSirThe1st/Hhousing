import { describe, expect, it } from "vitest";
import { createInMemoryListingIntentRepository } from "@hhousing/data-access";
import { getListingIntents } from "./get";

describe("getListingIntents", () => {
  it("returns list for authenticated manager", async () => {
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

    const response = await getListingIntents(
      {
        session: {
          userId: "usr_1",
          role: "manager"
        }
      },
      { repository }
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    if (response.body.success) {
      expect(response.body.data.meta.total).toBe(1);
      expect(response.body.data.meta.page).toBe(1);
      expect(response.body.data.meta.pageSize).toBe(12);
      expect(response.body.data.meta.hasNextPage).toBe(false);
    }
  });

  it("applies purpose filter and page slicing", async () => {
    const repository = createInMemoryListingIntentRepository();

    await repository.create({
      id: "lst_1",
      title: "Rent A",
      purpose: "rent",
      priceUsd: 1400,
      location: "Kinshasa",
      status: "draft",
      createdByUserId: "usr_1"
    });
    await repository.create({
      id: "lst_2",
      title: "Rent B",
      purpose: "rent",
      priceUsd: 1300,
      location: "Kinshasa",
      status: "draft",
      createdByUserId: "usr_1"
    });
    await repository.create({
      id: "lst_3",
      title: "Sale C",
      purpose: "sale",
      priceUsd: 90000,
      location: "Lubumbashi",
      status: "draft",
      createdByUserId: "usr_1"
    });

    const response = await getListingIntents(
      {
        session: {
          userId: "usr_1",
          role: "manager"
        },
        purpose: "rent",
        page: 1,
        pageSize: 1
      },
      { repository }
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    if (response.body.success) {
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.meta.total).toBe(2);
      expect(response.body.data.meta.page).toBe(1);
      expect(response.body.data.meta.pageSize).toBe(1);
      expect(response.body.data.meta.hasNextPage).toBe(true);
      expect(response.body.data.items[0]?.purpose).toBe("rent");
    }
  });

  it("applies location and price range filters", async () => {
    const repository = createInMemoryListingIntentRepository();

    await repository.create({
      id: "lst_1",
      title: "Rent A",
      purpose: "rent",
      priceUsd: 1400,
      location: "Kinshasa Gombe",
      status: "draft",
      createdByUserId: "usr_1"
    });
    await repository.create({
      id: "lst_2",
      title: "Rent B",
      purpose: "rent",
      priceUsd: 2200,
      location: "Kinshasa Limete",
      status: "draft",
      createdByUserId: "usr_1"
    });
    await repository.create({
      id: "lst_3",
      title: "Sale C",
      purpose: "sale",
      priceUsd: 90000,
      location: "Lubumbashi",
      status: "draft",
      createdByUserId: "usr_1"
    });

    const response = await getListingIntents(
      {
        session: {
          userId: "usr_1",
          role: "manager"
        },
        locationContains: "kinshasa",
        minPriceUsd: 1500,
        maxPriceUsd: 3000
      },
      { repository }
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    if (response.body.success) {
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0]?.id).toBe("lst_2");
      expect(response.body.data.meta.total).toBe(1);
    }
  });

  it("applies priceDesc sort", async () => {
    const repository = createInMemoryListingIntentRepository();

    await repository.create({
      id: "lst_1",
      title: "Low",
      purpose: "rent",
      priceUsd: 1000,
      location: "Kinshasa",
      status: "draft",
      createdByUserId: "usr_1"
    });
    await repository.create({
      id: "lst_2",
      title: "High",
      purpose: "rent",
      priceUsd: 5000,
      location: "Kinshasa",
      status: "draft",
      createdByUserId: "usr_1"
    });

    const response = await getListingIntents(
      {
        session: {
          userId: "usr_1",
          role: "manager"
        },
        sort: "priceDesc"
      },
      { repository }
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    if (response.body.success) {
      expect(response.body.data.items[0]?.id).toBe("lst_2");
      expect(response.body.data.items[1]?.id).toBe("lst_1");
    }
  });

  it("returns 401 when session is missing", async () => {
    const response = await getListingIntents({ session: null }, { repository: createInMemoryListingIntentRepository() });
    expect(response.status).toBe(401);
  });
});
