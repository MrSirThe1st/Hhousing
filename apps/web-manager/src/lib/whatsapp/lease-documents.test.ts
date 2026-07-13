import { describe, expect, it } from "vitest";
import { buildLeasePropertyLabel, resolveLeaseDocumentsLink } from "./lease-documents";

describe("buildLeasePropertyLabel", () => {
  it("includes unit number when available", () => {
    expect(buildLeasePropertyLabel({
      propertyName: "Résidence Les Palmiers",
      unitNumber: "12B"
    })).toBe("Résidence Les Palmiers - unité 12B");
  });

  it("falls back when property name is missing", () => {
    expect(buildLeasePropertyLabel({
      propertyName: null,
      unitNumber: "12B"
    })).toBe("Votre logement - unité 12B");
  });
});

describe("resolveLeaseDocumentsLink", () => {
  it("returns the first non-empty document URL", () => {
    expect(resolveLeaseDocumentsLink([
      { fileUrl: "" },
      { fileUrl: "https://example.com/bail.pdf" },
      { fileUrl: "https://example.com/rules.pdf" }
    ])).toBe("https://example.com/bail.pdf");
  });

  it("returns null when no document URL is available", () => {
    expect(resolveLeaseDocumentsLink([{ fileUrl: "   " }])).toBeNull();
  });
});
