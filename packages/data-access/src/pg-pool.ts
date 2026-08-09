import { Pool } from "pg";

/**
 * Process-wide shared Postgres pools, keyed by connection string.
 *
 * Tuned for Supabase transaction pooler (port 6543): cold TCP+auth often
 * takes 1–3s, and dashboard/layout fire parallel queries. A short
 * connectionTimeout causes "timeout exceeded when trying to connect" under
 * concurrent nav.
 *
 * connectionTimeoutMillis only covers TCP to the pooler — not waiting for a
 * free server backend. Keep `max` modest so we do not starve Supavisor;
 * statement_timeout (via connection options) is the backstop once a server
 * is assigned.
 *
 * Transactions that call pool.connect() continue to work — they check out a
 * dedicated client from this shared pool.
 */
const globalForPg = globalThis as unknown as {
  __hhousingPgPools?: Map<string, Pool>;
};

/** Bump when DEFAULT_POOL_OPTIONS change so HMR does not keep a stale pool. */
const POOL_OPTIONS_VERSION = 4;

const STATEMENT_TIMEOUT_MS = 15_000;

const DEFAULT_POOL_OPTIONS = {
  // Modest: each slot competes for a small Supavisor backend pool.
  max: 5,
  // Recycle idle clients so the pooler can reclaim them.
  idleTimeoutMillis: 10_000,
  // Remote pooler cold-connect is slow; concurrent checkouts wait on this.
  connectionTimeoutMillis: 30_000,
  allowExitOnIdle: true
} as const;

function poolCacheKey(connectionString: string): string {
  return `${connectionString}::v${POOL_OPTIONS_VERSION}`;
}

/**
 * Append statement_timeout for backends that honor startup GUCs.
 * Prefer URL `options` over Pool `options` + connect SET (races under pg).
 */
function withStatementTimeout(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    const existing = url.searchParams.get("options") ?? "";
    if (existing.includes("statement_timeout")) {
      return connectionString;
    }
    const timeoutOption = `-c statement_timeout=${STATEMENT_TIMEOUT_MS}`;
    url.searchParams.set("options", existing ? `${existing} ${timeoutOption}` : timeoutOption);
    return url.toString();
  } catch {
    return connectionString;
  }
}

export function getSharedPool(connectionString: string): Pool {
  if (!globalForPg.__hhousingPgPools) {
    globalForPg.__hhousingPgPools = new Map();
  }

  const key = poolCacheKey(connectionString);
  const existing = globalForPg.__hhousingPgPools.get(key);
  if (existing) {
    return existing;
  }

  const pool = new Pool({
    connectionString: withStatementTimeout(connectionString),
    ...DEFAULT_POOL_OPTIONS
  });

  pool.on("error", (error) => {
    console.error("[pg-pool] idle client error", error.message);
  });

  globalForPg.__hhousingPgPools.set(key, pool);
  return pool;
}
