import type { NextRequest } from "next/server";

/**
 * CORS for /api/mobile/* so Expo web (localhost / LAN) can call the hosted API.
 * Native apps ignore CORS. Auth is Bearer-token based (no cookies), so `*` is safe.
 */
export function buildMobileCorsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, X-Requested-With",
    "Access-Control-Max-Age": "86400"
  };
}

export function applyMobileCorsHeaders(headers: Headers, _request?: Request | NextRequest): void {
  const corsHeaders = buildMobileCorsHeaders();
  for (const [key, value] of Object.entries(corsHeaders)) {
    headers.set(key, value);
  }
}
