import { describe, expect, it } from "vitest";
import { getListingLabel } from "./index.js";

describe("getListingLabel", () => {
  it("returns rent label", () => {
    expect(getListingLabel("rent")).toBe("For Rent");
  });

  it("returns sale label", () => {
    expect(getListingLabel("sale")).toBe("For Sale");
  });
});
