import { Pool } from "pg";

/**
 * Process-wide shared Postgres pools, keyed by connection string.
 *
 * Tuned for Supabase PgBouncer (port 6543): cold TCP+auth often takes 1–3s,
 * and dashboard/layout fire many parallel queries. A short connectionTimeout
 * causes "timeout exceeded when trying to connect" under concurrent nav.
 *
 * Transactions that call pool.connect() continue to work — they check out a
 * dedicated client from this shared pool.
 */
const globalForPg = globalThis as unknown as {
  __hhousingPgPools?: Map<string, Pool>;
};

const DEFAULT_POOL_OPTIONS = {
  // Keep modest: each slot is a real backend connection through PgBouncer.
  max: 10,
  // Recycle idle clients so the pooler can reclaim them.
  idleTimeoutMillis: 10_000,
  // Remote pooler cold-connect is slow; concurrent checkouts wait on this.
  connectionTimeoutMillis: 30_000,
  allowExitOnIdle: true
} as const;

export function getSharedPool(connectionString: string): Pool {
  if (!globalForPg.__hhousingPgPools) {
    globalForPg.__hhousingPgPools = new Map();
  }

  const existing = globalForPg.__hhousingPgPools.get(connectionString);
  if (existing) {
    return existing;
  }

  const pool = new Pool({
    connectionString,
    ...DEFAULT_POOL_OPTIONS
  });

  pool.on("error", (error) => {
    console.error("[pg-pool] idle client error", error.message);
  });

  globalForPg.__hhousingPgPools.set(connectionString, pool);
  return pool;
}
