import { Pool, type QueryResultRow } from "pg";
import { readDatabaseEnv, type DatabaseEnvSource } from "../database/database-env";
import type {
  CreateTenantLoginOtpInput,
  TenantLoginOtpRecord,
  TenantLoginOtpRepository
} from "./tenant-otp-record.types";

interface TenantLoginOtpRow extends QueryResultRow {
  id: string;
  organization_id: string;
  tenant_id: string;
  phone_normalized: string;
  code_hash: string;
  expires_at: Date | string;
  consumed_at: Date | string | null;
  attempt_count: number;
  created_at: Date | string;
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function mapOtp(row: TenantLoginOtpRow): TenantLoginOtpRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    tenantId: row.tenant_id,
    phoneNormalized: row.phone_normalized,
    codeHash: row.code_hash,
    expiresAtIso: toIso(row.expires_at),
    consumedAtIso: row.consumed_at ? toIso(row.consumed_at) : null,
    attemptCount: row.attempt_count,
    createdAtIso: toIso(row.created_at)
  };
}

export interface TenantOtpQueryable {
  query<Row extends QueryResultRow>(
    text: string,
    values?: readonly unknown[]
  ): Promise<{ rows: Row[]; rowCount?: number | null }>;
}

const poolCache = new Map<string, Pool>();

function getOrCreatePool(connectionString: string): Pool {
  const existing = poolCache.get(connectionString);
  if (existing) {
    return existing;
  }
  const pool = new Pool({ connectionString, max: 5 });
  poolCache.set(connectionString, pool);
  return pool;
}

export function createPostgresTenantLoginOtpRepository(
  client: TenantOtpQueryable
): TenantLoginOtpRepository {
  return {
    async createOtp(input: CreateTenantLoginOtpInput): Promise<TenantLoginOtpRecord> {
      const result = await client.query<TenantLoginOtpRow>(
        `insert into tenant_login_otps (
           id, organization_id, tenant_id, phone_normalized, code_hash, expires_at
         ) values ($1, $2, $3, $4, $5, $6::timestamptz)
         returning id, organization_id, tenant_id, phone_normalized, code_hash,
                   expires_at, consumed_at, attempt_count, created_at`,
        [
          input.id,
          input.organizationId,
          input.tenantId,
          input.phoneNormalized,
          input.codeHash,
          input.expiresAtIso
        ]
      );

      if (!result.rows[0]) {
        throw new Error("TENANT_LOGIN_OTP_CREATE_FAILED");
      }

      return mapOtp(result.rows[0]);
    },

    async getLatestActiveOtp(phoneNormalized: string): Promise<TenantLoginOtpRecord | null> {
      const result = await client.query<TenantLoginOtpRow>(
        `select id, organization_id, tenant_id, phone_normalized, code_hash,
                expires_at, consumed_at, attempt_count, created_at
         from tenant_login_otps
         where phone_normalized = $1
           and consumed_at is null
           and expires_at > now()
         order by created_at desc
         limit 1`,
        [phoneNormalized]
      );

      return result.rows[0] ? mapOtp(result.rows[0]) : null;
    },

    async incrementAttemptCount(otpId: string): Promise<TenantLoginOtpRecord | null> {
      const result = await client.query<TenantLoginOtpRow>(
        `update tenant_login_otps
         set attempt_count = attempt_count + 1
         where id = $1
         returning id, organization_id, tenant_id, phone_normalized, code_hash,
                   expires_at, consumed_at, attempt_count, created_at`,
        [otpId]
      );

      return result.rows[0] ? mapOtp(result.rows[0]) : null;
    },

    async markConsumed(otpId: string): Promise<TenantLoginOtpRecord | null> {
      const result = await client.query<TenantLoginOtpRow>(
        `update tenant_login_otps
         set consumed_at = now()
         where id = $1
         returning id, organization_id, tenant_id, phone_normalized, code_hash,
                   expires_at, consumed_at, attempt_count, created_at`,
        [otpId]
      );

      return result.rows[0] ? mapOtp(result.rows[0]) : null;
    },

    async invalidateActiveOtps(phoneNormalized: string): Promise<void> {
      await client.query(
        `update tenant_login_otps
         set consumed_at = now()
         where phone_normalized = $1
           and consumed_at is null`,
        [phoneNormalized]
      );
    }
  };
}

export function createTenantLoginOtpRepositoryFromEnv(
  env: DatabaseEnvSource = process.env
): TenantLoginOtpRepository {
  const envResult = readDatabaseEnv(env);
  if (!envResult.success) {
    throw new Error(envResult.error);
  }

  return createPostgresTenantLoginOtpRepository(getOrCreatePool(envResult.data.connectionString));
}
