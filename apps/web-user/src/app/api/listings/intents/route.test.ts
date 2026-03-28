import { describe, expect, it } from "vitest";
import { createInMemoryListingIntentRepository } from "@hhousing/data-access";
import {
  createGetListingIntentsRoute,
  createPostListingIntentRoute
} from "./route-handler";

describe("POST /api/listings/intents route", () => {
  it("returns 201 for end-to-end success", async () => {
    const post = createPostListingIntentRoute({
      repository: createInMemoryListingIntentRepository(),
      createId: () => "lst_route_e2e_1",
      extractSession: async () => ({
        userId: "usr_manager_1",
        role: "manager"
      })
    });

    const response = await post(
      new Request("http://localhost/api/listings/intents", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          title: "Appartement moderne",
          purpose: "rent",
          priceUsd: 1800,
          location: "Kinshasa"
        })
      })
    );

    const body = (await response.json()) as {
      success: boolean;
      data?: { listingId: string };
    };

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data?.listingId).toBe("lst_route_e2e_1");
  });

  it("returns 401 when auth headers are missing", async () => {
    const post = createPostListingIntentRoute({
      repository: createInMemoryListingIntentRepository(),
      createId: () => "lst_route_e2e_2",
      extractSession: async () => null
    });

    const response = await post(
      new Request("http://localhost/api/listings/intents", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          title: "Appartement moderne",
          purpose: "rent",
          priceUsd: 1800,
          location: "Kinshasa"
        })
      })
    );

    expect(response.status).toBe(401);
  });
});

describe("GET /api/listings/intents route", () => {
  it("returns user-scoped list", async () => {
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

    const get = createGetListingIntentsRoute({
      repository,
      extractSession: async () => ({
        userId: "usr_manager_1",
        role: "manager"
      })
    });

    const response = await get(
      new Request("http://localhost/api/listings/intents", {
        method: "GET"
      })
    );

    const body = (await response.json()) as {
      success: boolean;
      data?: { items: Array<{ id: string }> };
    };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data?.items).toHaveLength(1);
    expect(body.data?.items[0]?.id).toBe("lst_1");
  });

  it("applies query params for page, pageSize, and purpose", async () => {
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
    await repository.create({
      id: "lst_2",
      title: "Maison familiale",
      purpose: "sale",
      priceUsd: 90000,
      location: "Lubumbashi",
      status: "draft",
      createdByUserId: "usr_manager_1"
    });

    const get = createGetListingIntentsRoute({
      repository,
      extractSession: async () => ({
        userId: "usr_manager_1",
        role: "manager"
      })
    });

    const response = await get(
      new Request("http://localhost/api/listings/intents?page=1&pageSize=1&purpose=rent", {
        method: "GET"
      })
    );

    const body = (await response.json()) as {
      success: boolean;
      data?: {
        items: Array<{ id: string; purpose: "rent" | "sale" }>;
        meta: { total: number; hasNextPage: boolean };
      };
    };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data?.items).toHaveLength(1);
    expect(body.data?.items[0]?.purpose).toBe("rent");
    expect(body.data?.meta.total).toBe(1);
    expect(body.data?.meta.hasNextPage).toBe(false);
  });

  it("applies locationContains and min/max price filters", async () => {
    const repository = createInMemoryListingIntentRepository();
    await repository.create({
      id: "lst_1",
      title: "Appartement moderne",
      purpose: "rent",
      priceUsd: 1800,
      location: "Kinshasa Gombe",
      status: "draft",
      createdByUserId: "usr_manager_1"
    });
    await repository.create({
      id: "lst_2",
      title: "Maison familiale",
      purpose: "rent",
      priceUsd: 1200,
      location: "Kinshasa Limete",
      status: "draft",
      createdByUserId: "usr_manager_1"
    });

    const get = createGetListingIntentsRoute({
      repository,
      extractSession: async () => ({
        userId: "usr_manager_1",
        role: "manager"
      })
    });

    const response = await get(
      new Request(
        "http://localhost/api/listings/intents?locationContains=kinshasa&minPriceUsd=1500&maxPriceUsd=2000",
        {
          method: "GET"
        }
      )
    );

    const body = (await response.json()) as {
      success: boolean;
      data?: {
        items: Array<{ id: string }>;
        meta: { total: number };
      };
    };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data?.items).toHaveLength(1);
    expect(body.data?.items[0]?.id).toBe("lst_1");
    expect(body.data?.meta.total).toBe(1);
  });

  it("applies sort query", async () => {
    const repository = createInMemoryListingIntentRepository();
    await repository.create({
      id: "lst_1",
      title: "Low",
      purpose: "rent",
      priceUsd: 1000,
      location: "Kinshasa",
      status: "draft",
      createdByUserId: "usr_manager_1"
    });
    await repository.create({
      id: "lst_2",
      title: "High",
      purpose: "rent",
      priceUsd: 5000,
      location: "Kinshasa",
      status: "draft",
      createdByUserId: "usr_manager_1"
    });

    const get = createGetListingIntentsRoute({
      repository,
      extractSession: async () => ({
        userId: "usr_manager_1",
        role: "manager"
      })
    });

    const response = await get(
      new Request("http://localhost/api/listings/intents?sort=priceDesc", {
        method: "GET"
      })
    );

    const body = (await response.json()) as {
      success: boolean;
      data?: {
        items: Array<{ id: string }>;
      };
    };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data?.items[0]?.id).toBe("lst_2");
  });

  it("returns 401 when auth headers are missing", async () => {
    const get = createGetListingIntentsRoute({
      repository: createInMemoryListingIntentRepository(),
      extractSession: async () => null
    });

    const response = await get(
      new Request("http://localhost/api/listings/intents", {
        method: "GET"
      })
    );

    expect(response.status).toBe(401);
  });
});
