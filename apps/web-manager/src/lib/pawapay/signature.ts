import { createHash, createVerify } from "node:crypto";
import type { PawapayConfig } from "./config";
import type { PawapayPublicKeysResponse } from "./types";

let cachedPublicKeys: PawapayPublicKeysResponse | null = null;
let cachedPublicKeysFetchedAt = 0;
const PUBLIC_KEY_CACHE_MS = 5 * 60 * 1000;

function parseContentDigestHeader(contentDigest: string): { algorithm: string; value: string } | null {
  const match = contentDigest.match(/^([a-z0-9-]+)=:(.+):$/i);
  if (!match) {
    return null;
  }

  return {
    algorithm: match[1].toLowerCase(),
    value: match[2]
  };
}

function hashBody(rawBody: string, algorithm: string): string {
  const normalized = algorithm.replace("-", "").toLowerCase();
  if (normalized === "sha256") {
    return createHash("sha256").update(rawBody).digest("base64");
  }
  if (normalized === "sha512") {
    return createHash("sha512").update(rawBody).digest("base64");
  }
  throw new Error(`Unsupported digest algorithm: ${algorithm}`);
}

export function verifyPawapayContentDigest(rawBody: string, contentDigestHeader: string | null): boolean {
  if (!contentDigestHeader) {
    return false;
  }

  const parsed = parseContentDigestHeader(contentDigestHeader);
  if (!parsed) {
    return false;
  }

  const computed = hashBody(rawBody, parsed.algorithm);
  return computed === parsed.value;
}

function extractSignatureBase(rawBody: string, headers: Headers): string {
  const signatureInput = headers.get("signature-input") ?? headers.get("Signature-Input");
  if (!signatureInput) {
    throw new Error("Missing Signature-Input header");
  }

  const coveredComponents = signatureInput.match(/"([^"]+)"/g)?.map((part) => part.replace(/"/g, "")) ?? [];
  const lines: string[] = [];

  for (const component of coveredComponents) {
    if (component === "@method") {
      lines.push('"@method": POST');
      continue;
    }
    if (component === "@target-uri") {
      continue;
    }
    if (component.startsWith("@")) {
      continue;
    }

    const headerValue = headers.get(component) ?? headers.get(component.toLowerCase());
    if (headerValue === null || headerValue === undefined) {
      throw new Error(`Missing signed header: ${component}`);
    }
    lines.push(`"${component}": ${headerValue}`);
  }

  if (lines.length === 0) {
    lines.push(`"content-digest": ${headers.get("content-digest") ?? headers.get("Content-Digest") ?? ""}`);
    lines.push(`"content-type": ${headers.get("content-type") ?? headers.get("Content-Type") ?? "application/json"}`);
  }

  void rawBody;
  return lines.join("\n");
}

async function fetchPublicKeys(config: PawapayConfig): Promise<PawapayPublicKeysResponse> {
  const now = Date.now();
  if (cachedPublicKeys && now - cachedPublicKeysFetchedAt < PUBLIC_KEY_CACHE_MS) {
    return cachedPublicKeys;
  }

  const response = await fetch(`${config.apiBaseUrl}/v2/public-key/http`, {
    headers: {
      Authorization: `Bearer ${config.apiToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch PawaPay public keys (${response.status})`);
  }

  const payload = (await response.json()) as PawapayPublicKeysResponse;
  cachedPublicKeys = payload;
  cachedPublicKeysFetchedAt = now;
  return payload;
}

function verifyWithPublicKey(publicKeyPem: string, signatureBase: string, signatureValue: string): boolean {
  const normalizedSignature = signatureValue.replace(/"/g, "").trim();
  const decodedSignature = Buffer.from(normalizedSignature, "base64");

  for (const algorithm of ["RSA-SHA256", "sha256", "SHA256"] as const) {
    try {
      const verifier = createVerify(algorithm);
      verifier.update(signatureBase);
      verifier.end();
      if (verifier.verify(publicKeyPem, decodedSignature)) {
        return true;
      }
    } catch {
      // Try next algorithm.
    }
  }

  return false;
}

export async function verifyPawapaySignedCallback(
  config: PawapayConfig,
  request: Request,
  rawBody: string
): Promise<boolean> {
  const contentDigest = request.headers.get("content-digest") ?? request.headers.get("Content-Digest");
  if (!verifyPawapayContentDigest(rawBody, contentDigest)) {
    return false;
  }

  const signatureHeader = request.headers.get("signature") ?? request.headers.get("Signature");
  if (!signatureHeader) {
    return false;
  }

  const signatureValueMatch = signatureHeader.match(/sig(?:\d+)?=:(.+?):/);
  const signatureValue = signatureValueMatch?.[1];
  if (!signatureValue) {
    return false;
  }

  const signatureBase = extractSignatureBase(rawBody, request.headers);
  const publicKeys = await fetchPublicKeys(config);
  const keys = publicKeys.keys ?? [];

  for (const key of keys) {
    const pem = key.publicKey.includes("BEGIN PUBLIC KEY")
      ? key.publicKey
      : `-----BEGIN PUBLIC KEY-----\n${key.publicKey}\n-----END PUBLIC KEY-----`;

    if (verifyWithPublicKey(pem, signatureBase, signatureValue)) {
      return true;
    }
  }

  return false;
}
