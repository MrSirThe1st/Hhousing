import { describe, expect, it } from "vitest";
import { createInMemoryListingIntentRepository } from "@hhousing/data-access";
import { postCreateListingIntent } from "./post";

describe("postCreateListingIntent", () => {
  it("returns 201 for success", async () => {
    const response = await postCreateListingIntent(
      {
        body: {
          title: "Centre-ville apartment",
          purpose: "rent",
          priceUsd: 1500,
          location: "Kinshasa"
        },
        session: {
          userId: "usr_manager_1",
          role: "manager"
        }
      },
      {
        createId: () => "lst_handler_1",
        repository: createInMemoryListingIntentRepository()
      }
    );

    expect(response.status).toBe(201);
  });

  it("returns 401 for missing auth", async () => {
    const response = await postCreateListingIntent({
      body: {
        title: "Centre-ville apartment",
        purpose: "rent",
        priceUsd: 1500,
        location: "Kinshasa"
      },
      session: null
    }, {
      repository: createInMemoryListingIntentRepository(),
      createId: () => "lst_handler_2"
    });

    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid payload", async () => {
    const response = await postCreateListingIntent({
      body: {
        title: "",
        purpose: "rent",
        priceUsd: 1500,
        location: "Kinshasa"
      },
      session: {
        userId: "usr_manager_1",
        role: "manager"
      }
    }, {
      repository: createInMemoryListingIntentRepository(),
      createId: () => "lst_handler_3"
    });

    expect(response.status).toBe(400);
  });

  it("returns 500 when database config is missing", async () => {
    const response = await postCreateListingIntent(
      {
        body: {
          title: "Centre-ville apartment",
          purpose: "rent",
          priceUsd: 1500,
          location: "Kinshasa"
        },
        session: {
          userId: "usr_manager_1",
          role: "manager"
        }
      },
      {
        env: {},
        createId: () => "lst_handler_4"
      }
    );

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
  });
});
