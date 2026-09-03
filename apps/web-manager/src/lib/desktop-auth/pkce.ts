import { createHash, timingSafeEqual } from "node:crypto";

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

export function isValidPkceState(value: string): boolean {
  return value.length >= 16 && value.length <= 128 && BASE64URL_PATTERN.test(value);
}

export function isValidPkceChallenge(value: string): boolean {
  return value.length >= 43 && value.length <= 128 && BASE64URL_PATTERN.test(value);
}

export function isValidPkceVerifier(value: string): boolean {
  return value.length >= 43 && value.length <= 128 && BASE64URL_PATTERN.test(value);
}

export function createS256Challenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function verifierMatchesChallenge(verifier: string, challenge: string): boolean {
  const computed = createS256Challenge(verifier);
  const left = Buffer.from(computed);
  const right = Buffer.from(challenge);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}
