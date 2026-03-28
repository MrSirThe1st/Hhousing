import { Pool, type QueryResultRow } from "pg";
import type { ApiResult } from "@hhousing/api-contracts";
import type { ListingIntentDraft } from "@hhousing/domain";
import { readDatabaseEnv, type DatabaseEnvSource } from "../database/database-env.js";
import type { ListingIntentRecord, ListingIntentRepository } from "./listing-intent-record.types.js";

interface ListingIntentRow extends QueryResultRow {
  id: string;
  title: string;
  purpose: "rent" | "sale";
  price_usd: number;
  location: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  created_by_user_id: string;
  created_at: Date | string;
}

export interface DatabaseQueryable {
  query<Row extends QueryResultRow>(
    text: string,
    values?: readonly unknown[]
  ): Promise<{ rows: Row[] }>;
}

const poolCache = new Map<string, Pool>();

function mapRowToRecord(row: ListingIntentRow): ListingIntentRecord {
  return {
    id: row.id,
    title: row.title,
    purpose: row.purpose,
    priceUsd: row.price_usd,
    location: row.location,
    status: row.status,
    createdByUserId: row.created_by_user_id,
    createdAtIso:
      row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
  };
}

function getOrCreatePool(connectionString: string): Pool {
  const existing = poolCache.get(connectionString);
  if (existing) {
    return existing;
  }

  const pool = new Pool({
    connectionString,
    max: 5
  });

  poolCache.set(connectionString, pool);
  return pool;
}

export function createPostgresListingIntentRepository(
  client: DatabaseQueryable
): ListingIntentRepository {
  return {
    async create(draft: ListingIntentDraft): Promise<ListingIntentRecord> {
      const result = await client.query<ListingIntentRow>(
        `insert into listing_intents (
          id,
          title,
          purpose,
          price_usd,
          location,
          status,
          created_by_user_id
        ) values ($1, $2, $3, $4, $5, $6, $7)
        returning id, title, purpose, price_usd, location, status, created_by_user_id, created_at`,
        [
          draft.id,
          draft.title,
          draft.purpose,
          draft.priceUsd,
          draft.location,
          draft.status,
          draft.createdByUserId
        ]
      );

      return mapRowToRecord(result.rows[0]);
    },
    async getById(id: string): Promise<ListingIntentRecord | null> {
      const result = await client.query<ListingIntentRow>(
        `select id, title, purpose, price_usd, location, status, created_by_user_id, created_at
         from listing_intents
         where id = $1`,
        [id]
      );

      const row = result.rows[0];
      return row ? mapRowToRecord(row) : null;
    },
    async listByCreatedByUserId(userId: string): Promise<ListingIntentRecord[]> {
      const result = await client.query<ListingIntentRow>(
        `select id, title, purpose, price_usd, location, status, created_by_user_id, created_at
         from listing_intents
         where created_by_user_id = $1
         order by created_at desc`,
        [userId]
      );

      return result.rows.map((row) => mapRowToRecord(row));
    },
    async listAll(): Promise<ListingIntentRecord[]> {
      const result = await client.query<ListingIntentRow>(
        `select id, title, purpose, price_usd, location, status, created_by_user_id, created_at
         from listing_intents
         order by created_at desc`
      );

      return result.rows.map((row) => mapRowToRecord(row));
    },
    async updateStatus(id: string, status: ListingIntentRow["status"]): Promise<ListingIntentRecord | null> {
      const result = await client.query<ListingIntentRow>(
        `update listing_intents
         set status = $2
         where id = $1
         returning id, title, purpose, price_usd, location, status, created_by_user_id, created_at`,
        [id, status]
      );

      const row = result.rows[0];
      return row ? mapRowToRecord(row) : null;
    }
  };
}

export function createPostgresListingIntentRepositoryFromConnectionString(
  connectionString: string
): ListingIntentRepository {
  return createPostgresListingIntentRepository(getOrCreatePool(connectionString));
}

export function createListingIntentRepositoryFromEnv(
  source: DatabaseEnvSource
): ApiResult<ListingIntentRepository> {
  const envResult = readDatabaseEnv(source);
  if (!envResult.success) {
    return envResult;
  }

  return {
    success: true,
    data: createPostgresListingIntentRepositoryFromConnectionString(
      envResult.data.connectionString
    )
  };
}
