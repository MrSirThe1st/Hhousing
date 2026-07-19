import { describe, expect, it } from "vitest";
import { formatPawapayAmount, normalizeDrcPhoneNumber } from "./amount";
import { normalizePawapayApiToken } from "./config";

describe("formatPawapayAmount", () => {
  it("rounds CDF amounts for Vodacom M-Pesa", () => {
    expect(formatPawapayAmount(1500.75, "VODACOM_MPESA_COD")).toBe("1501");
  });

  it("keeps two decimals for other providers", () => {
    expect(formatPawapayAmount(1500.5, "AIRTEL_COD")).toBe("1500.50");
  });
});

describe("normalizeDrcPhoneNumber", () => {
  it("normalizes local numbers starting with 0", () => {
    expect(normalizeDrcPhoneNumber("0812345678")).toBe("243812345678");
  });

  it("accepts numbers already prefixed with 243", () => {
    expect(normalizeDrcPhoneNumber("+243 812 345 678")).toBe("243812345678");
  });

  it("rejects invalid numbers", () => {
    expect(normalizeDrcPhoneNumber("123")).toBeNull();
  });
});

describe("normalizePawapayApiToken", () => {
  const token =
    "eyJraWQiOiIxIiwiYWxnIjoiRVMyNTYifQ.eyJ0dCI6IkFBVCIsInN1YiI6IjI0MTIyIn0.signature";

  it("extracts a JWT when the env key name was pasted into the value", () => {
    expect(normalizePawapayApiToken(`PAWAPAY_API_TOKEN=${token}`)).toBe(token);
  });

  it("strips Bearer prefix and duplicated pastes", () => {
    expect(normalizePawapayApiToken(`Bearer ${token} PAWAPAY_API_TOKEN=${token}`)).toBe(token);
  });
});
