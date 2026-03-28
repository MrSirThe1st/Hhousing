import { describe, expect, it } from "vitest";
import { createListingIntentDraft } from "./create-listing-intent.js";

describe("createListingIntentDraft", () => {
  it("creates a draft listing intent", () => {
    const result = createListingIntentDraft({
      id: "lst_1001",
      title: "Furnished apartment",
      purpose: "rent",
      priceUsd: 900,
      location: "Kinshasa",
      createdByUserId: "usr_1"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.status).toBe("draft");
  });

  it("rejects invalid domain values", () => {
    const result = createListingIntentDraft({
      id: "x",
      title: "ab",
      purpose: "sale",
      priceUsd: 0,
      location: "k",
      createdByUserId: "u"
    });

    expect(result.ok).toBe(false);
  });
});
