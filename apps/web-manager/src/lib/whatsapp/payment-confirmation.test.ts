import { describe, expect, it } from "vitest";
import { buildPaymentConcerningLabel, formatPaymentAmountLabel } from "./payment-confirmation";

describe("formatPaymentAmountLabel", () => {
  it("formats amounts using French locale", () => {
    expect(formatPaymentAmountLabel(1500)).toMatch(/1.500,00/);
  });
});

describe("buildPaymentConcerningLabel", () => {
  it("uses the invoice period when available", () => {
    expect(buildPaymentConcerningLabel({
      period: "Avril 2026",
      invoiceNumber: "FAC-2026-00012"
    })).toBe("Avril 2026");
  });

  it("falls back to the invoice number", () => {
    expect(buildPaymentConcerningLabel({
      period: null,
      invoiceNumber: "FAC-2026-00012"
    })).toBe("Facture FAC-2026-00012");
  });
});
