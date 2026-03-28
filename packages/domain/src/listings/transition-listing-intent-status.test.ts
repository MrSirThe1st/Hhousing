import { describe, expect, it } from "vitest";
import { transitionListingIntentStatus } from "./transition-listing-intent-status.js";

describe("transitionListingIntentStatus", () => {
  it("allows draft to submitted", () => {
    const result = transitionListingIntentStatus("draft", "submitted");
    expect(result).toEqual({ ok: true, value: "submitted" });
  });

  it("allows submitted to approved", () => {
    const result = transitionListingIntentStatus("submitted", "approved");
    expect(result).toEqual({ ok: true, value: "approved" });
  });

  it("blocks invalid transitions", () => {
    const result = transitionListingIntentStatus("draft", "approved");
    expect(result.ok).toBe(false);
  });
});
