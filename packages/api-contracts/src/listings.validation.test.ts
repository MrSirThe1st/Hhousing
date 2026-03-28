import { describe, expect, it } from "vitest";
import { parseCreateListingIntentInput } from "./listings.validation.js";

describe("parseCreateListingIntentInput", () => {
  it("parses a valid payload", () => {
    const result = parseCreateListingIntentInput({
      title: "Gombe apartment",
      purpose: "rent",
      priceUsd: 1200,
      location: "Kinshasa"
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid payload", () => {
    const result = parseCreateListingIntentInput({
      title: "",
      purpose: "lease",
      priceUsd: 0,
      location: ""
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.code).toBe("VALIDATION_ERROR");
  });
});
