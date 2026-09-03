import { describe, expect, it } from "vitest";
import { createS256Challenge, verifierMatchesChallenge } from "./pkce";

describe("desktop auth PKCE", () => {
  it("creates an S256 challenge that matches the verifier", () => {
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const challenge = createS256Challenge(verifier);

    expect(challenge).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
    expect(verifierMatchesChallenge(verifier, challenge)).toBe(true);
  });

  it("rejects a mismatched verifier", () => {
    const challenge = createS256Challenge("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    expect(verifierMatchesChallenge("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", challenge)).toBe(false);
  });
});
