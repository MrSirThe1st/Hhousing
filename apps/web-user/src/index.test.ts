import { describe, expect, it } from "vitest";
import { buildMarketplaceHeading } from "./index";

describe("buildMarketplaceHeading", () => {
  it("builds heading using shared domain package", () => {
    expect(buildMarketplaceHeading()).toBe("Hhousing - For Rent");
  });
});
