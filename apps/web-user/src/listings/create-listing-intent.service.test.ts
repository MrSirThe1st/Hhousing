import { describe, expect, it } from "vitest";
import { createInMemoryListingIntentRepository } from "@hhousing/data-access";
import type { AuthSession } from "@hhousing/api-contracts";
import { createListingIntent } from "./create-listing-intent.service";

const allowedSession: AuthSession = {
  userId: "usr_manager_1",
  role: "manager"
};

describe("createListingIntent", () => {
  it("creates and persists listing intent when auth and validation pass", async () => {
    const repository = createInMemoryListingIntentRepository({
      now: () => "2026-03-28T00:00:00.000Z"
    });

    const result = await createListingIntent(
      {
        title: "Maison familiale",
        purpose: "sale",
        priceUsd: 55000,
        location: "Lubumbashi"
      },
      allowedSession,
      {
        createId: () => "lst_approved_1",
        repository
      }
    );

    expect(result).toEqual({
      success: true,
      data: {
        listingId: "lst_approved_1",
        status: "draft"
      }
    });

    await expect(repository.getById("lst_approved_1")).resolves.toMatchObject({
      id: "lst_approved_1",
      title: "Maison familiale"
    });
  });

  it("rejects unauthenticated requests", async () => {
    const repository = createInMemoryListingIntentRepository();

    const result = await createListingIntent(
      {
        title: "Maison familiale",
        purpose: "sale",
        priceUsd: 55000,
        location: "Lubumbashi"
      },
      null,
      {
        createId: () => "lst_approved_1",
        repository
      }
    );

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.code).toBe("UNAUTHORIZED");
  });

  it("rejects unauthorized roles", async () => {
    const repository = createInMemoryListingIntentRepository();

    const result = await createListingIntent(
      {
        title: "Maison familiale",
        purpose: "sale",
        priceUsd: 55000,
        location: "Lubumbashi"
      },
      {
        userId: "usr_tenant_1",
        role: "tenant"
      },
      {
        createId: () => "lst_approved_1",
        repository
      }
    );

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.code).toBe("FORBIDDEN");
  });

  it("rejects invalid input", async () => {
    const repository = createInMemoryListingIntentRepository();

    const result = await createListingIntent(
      {
        title: "",
        purpose: "sale",
        priceUsd: 55000,
        location: "Lubumbashi"
      },
      allowedSession,
      {
        createId: () => "lst_approved_1",
        repository
      }
    );

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.code).toBe("VALIDATION_ERROR");
  });
});
