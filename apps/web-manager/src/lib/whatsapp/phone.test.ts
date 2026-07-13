import { describe, expect, it } from "vitest";
import { normalizeWhatsAppPhoneNumber, resolveTenantWhatsAppRecipient } from "./phone";

describe("normalizeWhatsAppPhoneNumber", () => {
  it("normalizes DRC local numbers", () => {
    expect(normalizeWhatsAppPhoneNumber("0812345678")).toBe("243812345678");
  });

  it("normalizes international numbers with country code", () => {
    expect(normalizeWhatsAppPhoneNumber("+1 (555) 194-2469")).toBe("15551942469");
    expect(normalizeWhatsAppPhoneNumber("27681609849")).toBe("27681609849");
  });

  it("rejects invalid numbers", () => {
    expect(normalizeWhatsAppPhoneNumber("123")).toBeNull();
  });
});

describe("resolveTenantWhatsAppRecipient", () => {
  it("prefers whatsappNumber over phone", () => {
    expect(
      resolveTenantWhatsAppRecipient({
        phone: "0812345678",
        whatsappNumber: "27681609849",
        whatsappOptIn: true
      })
    ).toBe("27681609849");
  });

  it("falls back to phone", () => {
    expect(
      resolveTenantWhatsAppRecipient({
        phone: "+243 812 345 678",
        whatsappNumber: null,
        whatsappOptIn: true
      })
    ).toBe("243812345678");
  });

  it("returns null when tenant has not opted in", () => {
    expect(
      resolveTenantWhatsAppRecipient({
        phone: "+243 812 345 678",
        whatsappNumber: null,
        whatsappOptIn: false
      })
    ).toBeNull();
  });
});
