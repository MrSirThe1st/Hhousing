import { describe, expect, it } from "vitest";
import type { AuthSession } from "@hhousing/api-contracts";
import { createInMemoryListingIntentRepository } from "@hhousing/data-access";
import { createListingIntent } from "./create-listing-intent";

const allowedSession: AuthSession = {
  userId: "usr_manager_1",
  role: "manager"
};

describe("createListingIntent", () => {
  it("creates listing intent when auth and validation pass", async () => {
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
        repository: createInMemoryListingIntentRepository()
      }
    );

    expect(result).toEqual({
      success: true,
      data: {
        listingId: "lst_approved_1",
        status: "draft"
      }
    });
  });

  it("rejects unauthenticated requests", async () => {
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
        repository: createInMemoryListingIntentRepository()
      }
    );

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.code).toBe("UNAUTHORIZED");
  });

  it("rejects unauthorized roles", async () => {
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
        repository: createInMemoryListingIntentRepository()
      }
    );

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.code).toBe("FORBIDDEN");
  });

  it("rejects invalid input", async () => {
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
        repository: createInMemoryListingIntentRepository()
      }
    );

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.code).toBe("VALIDATION_ERROR");
  });
});
