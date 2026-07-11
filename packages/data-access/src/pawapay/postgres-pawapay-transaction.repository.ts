import { Pool, type QueryResultRow } from "pg";
import type {
  PawapayOperationType,
  PawapayProviderCode,
  PawapayTransaction,
  PawapayTransactionAllocation,
  PawapayTransactionStatus
} from "@hhousing/domain";
import { readDatabaseEnv, type DatabaseEnvSource } from "../database/database-env";
import type {
  CreatePawapayTransactionInput,
  PawapayTransactionRepository,
  UpdatePawapayTransactionStatusInput
} from "./pawapay-transaction-record.types";

interface PawapayTransactionRow extends QueryResultRow {
  id: string;
  organization_id: string;
  tenant_id: string;
  lease_id: string;
  operation_type: PawapayOperationType;
  total_amount: string | number;
  currency_code: string;
  provider: PawapayProviderCode;
  phone_number: string;
  pawapay_status: string | null;
  failure_code: string | null;
  failure_message: string | null;
  status: PawapayTransactionStatus;
  created_at: Date | string;
  updated_at: Date | string;
  completed_at: Date | string | null;
}

interface AllocationRow extends QueryResultRow {
  payment_id: string;
  amount: string | number;
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function toNumber(value: string | number): number {
  return typeof value === "number" ? value : Number(value);
}

function mapTransaction(
  row: PawapayTransactionRow,
  allocations: AllocationRow[]
): PawapayTransaction {
  return {
    id: row.id,
    organizationId: row.organization_id,
    tenantId: row.tenant_id,
    leaseId: row.lease_id,
    operationType: row.operation_type,
    totalAmount: toNumber(row.total_amount),
    currencyCode: row.currency_code,
    provider: row.provider,
    phoneNumber: row.phone_number,
    pawapayStatus: row.pawapay_status,
    failureCode: row.failure_code,
    failureMessage: row.failure_message,
    status: row.status,
    allocations: allocations.map((allocation) => ({
      paymentId: allocation.payment_id,
      amount: toNumber(allocation.amount)
    })),
    createdAtIso: toIso(row.created_at),
    updatedAtIso: toIso(row.updated_at),
    completedAtIso: row.completed_at ? toIso(row.completed_at) : null
  };
}

export interface PawapayTransactionQueryable {
  query<Row extends QueryResultRow>(
    text: string,
    values?: readonly unknown[]
  ): Promise<{ rows: Row[]; rowCount?: number | null }>;
}

const poolCache = new Map<string, Pool>();

function getOrCreatePool(connectionString: string): Pool {
  const existing = poolCache.get(connectionString);
  if (existing) return existing;
  const pool = new Pool({ connectionString, max: 5 });
  poolCache.set(connectionString, pool);
  return pool;
}

async function loadAllocations(
  client: PawapayTransactionQueryable,
  transactionId: string
): Promise<AllocationRow[]> {
  const result = await client.query<AllocationRow>(
    `select payment_id, amount
     from pawapay_transaction_allocations
     where transaction_id = $1
     order by payment_id asc`,
    [transactionId]
  );
  return result.rows;
}

export function createPostgresPawapayTransactionRepository(
  client: PawapayTransactionQueryable
): PawapayTransactionRepository {
  return {
    async createTransaction(input: CreatePawapayTransactionInput): Promise<PawapayTransaction> {
      await client.query(
        `insert into pawapay_transactions (
          id, organization_id, tenant_id, lease_id, operation_type,
          total_amount, currency_code, provider, phone_number, status
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')`,
        [
          input.id,
          input.organizationId,
          input.tenantId,
          input.leaseId,
          input.operationType,
          input.totalAmount,
          input.currencyCode,
          input.provider,
          input.phoneNumber
        ]
      );

      for (const allocation of input.allocations) {
        await client.query(
          `insert into pawapay_transaction_allocations (transaction_id, payment_id, amount)
           values ($1, $2, $3)`,
          [input.id, allocation.paymentId, allocation.amount]
        );
      }

      const row = await client.query<PawapayTransactionRow>(
        `select
           id, organization_id, tenant_id, lease_id, operation_type,
           total_amount, currency_code, provider, phone_number,
           pawapay_status, failure_code, failure_message, status,
           created_at, updated_at, completed_at
         from pawapay_transactions
         where id = $1`,
        [input.id]
      );

      const allocations = await loadAllocations(client, input.id);
      return mapTransaction(row.rows[0], allocations);
    },

    async getTransactionById(transactionId: string): Promise<PawapayTransaction | null> {
      const row = await client.query<PawapayTransactionRow>(
        `select
           id, organization_id, tenant_id, lease_id, operation_type,
           total_amount, currency_code, provider, phone_number,
           pawapay_status, failure_code, failure_message, status,
           created_at, updated_at, completed_at
         from pawapay_transactions
         where id = $1`,
        [transactionId]
      );

      if (row.rows.length === 0) return null;
      const allocations = await loadAllocations(client, transactionId);
      return mapTransaction(row.rows[0], allocations);
    },

    async getTransactionByIdForTenant(
      transactionId: string,
      tenantAuthUserId: string,
      organizationId: string
    ): Promise<PawapayTransaction | null> {
      const row = await client.query<PawapayTransactionRow>(
        `select
           pt.id, pt.organization_id, pt.tenant_id, pt.lease_id, pt.operation_type,
           pt.total_amount, pt.currency_code, pt.provider, pt.phone_number,
           pt.pawapay_status, pt.failure_code, pt.failure_message, pt.status,
           pt.created_at, pt.updated_at, pt.completed_at
         from pawapay_transactions pt
         join tenants t on t.id = pt.tenant_id
         where pt.id = $1
           and pt.organization_id = $2
           and t.auth_user_id = $3`,
        [transactionId, organizationId, tenantAuthUserId]
      );

      if (row.rows.length === 0) return null;
      const allocations = await loadAllocations(client, transactionId);
      return mapTransaction(row.rows[0], allocations);
    },

    async hasInFlightTransactionForTenant(
      tenantId: string,
      organizationId: string
    ): Promise<boolean> {
      const result = await client.query<{ id: string }>(
        `select id
         from pawapay_transactions
         where tenant_id = $1
           and organization_id = $2
           and status in ('pending', 'submitted')
         limit 1`,
        [tenantId, organizationId]
      );
      return result.rows.length > 0;
    },

    async updateTransactionStatus(
      input: UpdatePawapayTransactionStatusInput
    ): Promise<PawapayTransaction | null> {
      const completedAt =
        input.status === "completed" || input.status === "failed" ? new Date().toISOString() : null;

      const result = await client.query<PawapayTransactionRow>(
        `update pawapay_transactions
         set status = $2,
             pawapay_status = $3,
             failure_code = $4,
             failure_message = $5,
             updated_at = now(),
             completed_at = coalesce($6::timestamptz, completed_at)
         where id = $1
         returning
           id, organization_id, tenant_id, lease_id, operation_type,
           total_amount, currency_code, provider, phone_number,
           pawapay_status, failure_code, failure_message, status,
           created_at, updated_at, completed_at`,
        [
          input.transactionId,
          input.status,
          input.pawapayStatus,
          input.failureCode ?? null,
          input.failureMessage ?? null,
          completedAt
        ]
      );

      if (result.rows.length === 0) return null;
      const allocations = await loadAllocations(client, input.transactionId);
      return mapTransaction(result.rows[0], allocations);
    }
  };
}

export function createPawapayTransactionRepositoryFromEnv(
  env: DatabaseEnvSource
): PawapayTransactionRepository {
  const envResult = readDatabaseEnv(env);
  if (!envResult.success) {
    throw new Error(envResult.error);
  }
  const pool = getOrCreatePool(envResult.data.connectionString);
  return createPostgresPawapayTransactionRepository(pool);
}
