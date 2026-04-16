import { Pool, type PoolClient, type QueryResultRow } from "pg";
import type { ListInvoicesFilter } from "@hhousing/api-contracts";
import type {
  Invoice,
  InvoiceEmailJob,
  InvoicePaymentApplication,
  LeaseCreditBalance
} from "@hhousing/domain";
import { readDatabaseEnv, type DatabaseEnvSource } from "../database/database-env";
import type {
  InvoiceDetailRecord,
  InvoiceRepository,
  ProcessableInvoiceEmailJob,
  QueueInvoiceEmailJobInput,
  SyncInvoiceForPaidPaymentInput,
  SyncInvoiceForPaidPaymentOutput
} from "./invoice-record.types";

interface InvoiceRow extends QueryResultRow {
  id: string;
  organization_id: string;
  lease_id: string;
  tenant_id: string;
  property_id: string;
  unit_id: string;
  invoice_year: number;
  invoice_sequence: number;
  invoice_number: string;
  invoice_type: "monthly" | "one_time";
  period: string | null;
  issue_date: string | Date;
  due_date: string | Date;
  currency_code: string;
  total_amount: string | number;
  amount_paid: string | number;
  status: "issued" | "partial" | "paid" | "void";
  paid_at: string | Date | null;
  email_status: "not_sent" | "queued" | "sent" | "failed";
  email_sent_count: number;
  last_emailed_at: string | Date | null;
  last_email_error: string | null;
  void_reason: string | null;
  voided_at: string | Date | null;
  source_payment_id: string | null;
  created_at: string | Date;
}

interface InvoicePaymentApplicationRow extends QueryResultRow {
  id: string;
  organization_id: string;
  invoice_id: string;
  payment_id: string;
  applied_amount: string | number;
  applied_at: string | Date;
  created_at: string | Date;
}

interface LeaseCreditBalanceRow extends QueryResultRow {
  id: string;
  organization_id: string;
  lease_id: string;
  currency_code: string;
  credit_amount: string | number;
  updated_at: string | Date;
}

interface InvoiceEmailJobRow extends QueryResultRow {
  id: string;
  organization_id: string;
  invoice_id: string;
  job_kind: "send" | "resend" | "auto_on_paid";
  status: "queued" | "processing" | "sent" | "failed";
  attempt_count: number;
  max_attempts: number;
  next_attempt_at: string | Date;
  last_error: string | null;
  locked_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
}

interface LeaseContextRow extends QueryResultRow {
  property_id: string;
  unit_id: string;
}

interface TenantEmailRow extends QueryResultRow {
  tenant_email: string | null;
  tenant_full_name: string;
}

export interface InvoiceQueryable {
  query<Row extends QueryResultRow>(
    text: string,
    values?: readonly unknown[]
  ): Promise<{ rows: Row[]; rowCount?: number | null }>;
  connect?: () => Promise<PoolClient>;
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

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function toIsoDate(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return value.slice(0, 10);
}

function toNumber(value: string | number): number {
  return typeof value === "number" ? value : Number(value);
}

function mapInvoice(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    organizationId: row.organization_id,
    leaseId: row.lease_id,
    tenantId: row.tenant_id,
    propertyId: row.property_id,
    unitId: row.unit_id,
    invoiceYear: row.invoice_year,
    invoiceSequence: row.invoice_sequence,
    invoiceNumber: row.invoice_number,
    invoiceType: row.invoice_type,
    period: row.period,
    issueDate: toIsoDate(row.issue_date),
    dueDate: toIsoDate(row.due_date),
    currencyCode: row.currency_code,
    totalAmount: toNumber(row.total_amount),
    amountPaid: toNumber(row.amount_paid),
    status: row.status,
    paidAt: row.paid_at ? toIsoDate(row.paid_at) : null,
    emailStatus: row.email_status,
    emailSentCount: row.email_sent_count,
    lastEmailedAtIso: row.last_emailed_at ? toIso(row.last_emailed_at) : null,
    lastEmailError: row.last_email_error,
    voidReason: row.void_reason,
    voidedAtIso: row.voided_at ? toIso(row.voided_at) : null,
    sourcePaymentId: row.source_payment_id,
    createdAtIso: toIso(row.created_at)
  };
}

function mapApplication(row: InvoicePaymentApplicationRow): InvoicePaymentApplication {
  return {
    id: row.id,
    organizationId: row.organization_id,
    invoiceId: row.invoice_id,
    paymentId: row.payment_id,
    appliedAmount: toNumber(row.applied_amount),
    appliedAtIso: toIso(row.applied_at),
    createdAtIso: toIso(row.created_at)
  };
}

function mapCredit(row: LeaseCreditBalanceRow): LeaseCreditBalance {
  return {
    id: row.id,
    organizationId: row.organization_id,
    leaseId: row.lease_id,
    currencyCode: row.currency_code,
    creditAmount: toNumber(row.credit_amount),
    updatedAtIso: toIso(row.updated_at)
  };
}

function mapEmailJob(row: InvoiceEmailJobRow): InvoiceEmailJob {
  return {
    id: row.id,
    organizationId: row.organization_id,
    invoiceId: row.invoice_id,
    jobKind: row.job_kind,
    status: row.status,
    attemptCount: row.attempt_count,
    maxAttempts: row.max_attempts,
    nextAttemptAtIso: toIso(row.next_attempt_at),
    lastError: row.last_error,
    lockedAtIso: row.locked_at ? toIso(row.locked_at) : null,
    createdAtIso: toIso(row.created_at),
    updatedAtIso: toIso(row.updated_at)
  };
}

function getYearFromIsoDate(dateValue: string): number {
  return Number(dateValue.slice(0, 4));
}

function buildInvoiceNumber(year: number, sequence: number): string {
  return `INV-${year}-${String(sequence).padStart(6, "0")}`;
}

function withTransaction<T>(
  client: InvoiceQueryable,
  callback: (tx: PoolClient) => Promise<T>
): Promise<T> {
  if (!client.connect) {
    throw new Error("Invoice repository requires a transactional client");
  }

  return client.connect().then(async (tx) => {
    try {
      await tx.query("begin");
      const result = await callback(tx);
      await tx.query("commit");
      return result;
    } catch (error) {
      await tx.query("rollback");
      throw error;
    } finally {
      tx.release();
    }
  });
}

export function createPostgresInvoiceRepository(client: InvoiceQueryable): InvoiceRepository {
  return {
    async listInvoices(filter: ListInvoicesFilter): Promise<Invoice[]> {
      const conditions: string[] = ["organization_id = $1"];
      const values: unknown[] = [filter.organizationId];
      let index = 2;

      if (filter.leaseId !== undefined) {
        conditions.push(`lease_id = $${index}`);
        values.push(filter.leaseId);
        index += 1;
      }

      if (filter.status !== undefined) {
        conditions.push(`status = $${index}`);
        values.push(filter.status);
        index += 1;
      }

      if (filter.emailStatus !== undefined) {
        conditions.push(`email_status = $${index}`);
        values.push(filter.emailStatus);
        index += 1;
      }

      if (filter.year !== undefined) {
        conditions.push(`invoice_year = $${index}`);
        values.push(filter.year);
        index += 1;
      }

      const result = await client.query<InvoiceRow>(
        `select
           id, organization_id, lease_id, tenant_id, property_id, unit_id,
           invoice_year, invoice_sequence, invoice_number, invoice_type, period,
           issue_date, due_date, currency_code, total_amount, amount_paid,
           status, paid_at, email_status, email_sent_count, last_emailed_at,
           last_email_error, void_reason, voided_at, source_payment_id, created_at
         from invoices
         where ${conditions.join(" and ")}
         order by issue_date desc, invoice_sequence desc`,
        values
      );

      return result.rows.map(mapInvoice);
    },

    async listLeaseCreditBalances(organizationId: string): Promise<LeaseCreditBalance[]> {
      const result = await client.query<LeaseCreditBalanceRow>(
        `select id, organization_id, lease_id, currency_code, credit_amount, updated_at
         from lease_credit_balances
         where organization_id = $1
         order by updated_at desc`,
        [organizationId]
      );

      return result.rows.map(mapCredit);
    },

    async getInvoiceById(invoiceId: string, organizationId: string): Promise<Invoice | null> {
      const result = await client.query<InvoiceRow>(
        `select
           id, organization_id, lease_id, tenant_id, property_id, unit_id,
           invoice_year, invoice_sequence, invoice_number, invoice_type, period,
           issue_date, due_date, currency_code, total_amount, amount_paid,
           status, paid_at, email_status, email_sent_count, last_emailed_at,
           last_email_error, void_reason, voided_at, source_payment_id, created_at
         from invoices
         where id = $1 and organization_id = $2
         limit 1`,
        [invoiceId, organizationId]
      );

      return result.rows[0] ? mapInvoice(result.rows[0]) : null;
    },

    async getInvoiceDetail(invoiceId: string, organizationId: string): Promise<InvoiceDetailRecord | null> {
      const invoice = await this.getInvoiceById(invoiceId, organizationId);
      if (!invoice) {
        return null;
      }

      const [applicationsResult, creditResult, jobsResult] = await Promise.all([
        client.query<InvoicePaymentApplicationRow>(
          `select
             id, organization_id, invoice_id, payment_id, applied_amount, applied_at, created_at
           from invoice_payment_applications
           where invoice_id = $1 and organization_id = $2
           order by created_at asc`,
          [invoiceId, organizationId]
        ),
        client.query<LeaseCreditBalanceRow>(
          `select id, organization_id, lease_id, currency_code, credit_amount, updated_at
           from lease_credit_balances
           where lease_id = $1 and organization_id = $2 and currency_code = $3
           limit 1`,
          [invoice.leaseId, organizationId, invoice.currencyCode]
        ),
        client.query<InvoiceEmailJobRow>(
          `select
             id, organization_id, invoice_id, job_kind, status, attempt_count,
             max_attempts, next_attempt_at, last_error, locked_at, created_at, updated_at
           from invoice_email_jobs
           where invoice_id = $1 and organization_id = $2
           order by created_at desc
           limit 20`,
          [invoiceId, organizationId]
        )
      ]);

      return {
        invoice,
        applications: applicationsResult.rows.map(mapApplication),
        creditBalance: creditResult.rows[0] ? mapCredit(creditResult.rows[0]) : null,
        emailJobs: jobsResult.rows.map(mapEmailJob)
      };
    },

    async voidInvoice(
      invoiceId: string,
      organizationId: string,
      reason: string
    ): Promise<{ invoice: Invoice; creditAdjustedAmount: number } | null> {
      return withTransaction(client, async (tx) => {
        const invoiceResult = await tx.query<InvoiceRow>(
          `select
             id, organization_id, lease_id, tenant_id, property_id, unit_id,
             invoice_year, invoice_sequence, invoice_number, invoice_type, period,
             issue_date, due_date, currency_code, total_amount, amount_paid,
             status, paid_at, email_status, email_sent_count, last_emailed_at,
             last_email_error, void_reason, voided_at, source_payment_id, created_at
           from invoices
           where id = $1 and organization_id = $2
           for update`,
          [invoiceId, organizationId]
        );

        const invoiceRow = invoiceResult.rows[0];
        if (!invoiceRow) {
          return null;
        }

        if (invoiceRow.status === "void") {
          return {
            invoice: mapInvoice(invoiceRow),
            creditAdjustedAmount: 0
          };
        }

        const creditAdjustedAmount = toNumber(invoiceRow.amount_paid);
        if (creditAdjustedAmount > 0) {
          await tx.query(
            `insert into lease_credit_balances (
               id, organization_id, lease_id, currency_code, credit_amount, updated_at
             ) values (
               'crd_' || replace(gen_random_uuid()::text, '-', ''),
               $1, $2, $3, $4, now()
             )
             on conflict (organization_id, lease_id, currency_code)
             do update set
               credit_amount = lease_credit_balances.credit_amount + excluded.credit_amount,
               updated_at = now()`,
            [organizationId, invoiceRow.lease_id, invoiceRow.currency_code, creditAdjustedAmount]
          );
        }

        const updatedResult = await tx.query<InvoiceRow>(
          `update invoices
           set status = 'void',
               void_reason = $3,
               voided_at = now(),
               email_status = 'not_sent',
               last_email_error = null
           where id = $1 and organization_id = $2
           returning
             id, organization_id, lease_id, tenant_id, property_id, unit_id,
             invoice_year, invoice_sequence, invoice_number, invoice_type, period,
             issue_date, due_date, currency_code, total_amount, amount_paid,
             status, paid_at, email_status, email_sent_count, last_emailed_at,
             last_email_error, void_reason, voided_at, source_payment_id, created_at`,
          [invoiceId, organizationId, reason]
        );

        if (!updatedResult.rows[0]) {
          return null;
        }

        return {
          invoice: mapInvoice(updatedResult.rows[0]),
          creditAdjustedAmount
        };
      });
    },

    async queueInvoiceEmailJob(input: QueueInvoiceEmailJobInput): Promise<boolean> {
      const result = await client.query(
        `insert into invoice_email_jobs (
           id, organization_id, invoice_id, job_kind, status, attempt_count, max_attempts, next_attempt_at
         ) values ($1, $2, $3, $4, 'queued', 0, $5, now())`,
        [input.id, input.organizationId, input.invoiceId, input.reason, input.maxAttempts ?? 3]
      );

      if ((result.rowCount ?? 0) > 0) {
        await client.query(
          `update invoices
           set email_status = 'queued', last_email_error = null
           where id = $1 and organization_id = $2 and status <> 'void'`,
          [input.invoiceId, input.organizationId]
        );
      }

      return (result.rowCount ?? 0) > 0;
    },

    async syncInvoiceForPaidPayment(input: SyncInvoiceForPaidPaymentInput): Promise<SyncInvoiceForPaidPaymentOutput> {
      return withTransaction(client, async (tx) => {
        const existingApplicationResult = await tx.query<InvoicePaymentApplicationRow>(
          `select
             id, organization_id, invoice_id, payment_id, applied_amount, applied_at, created_at
           from invoice_payment_applications
           where organization_id = $1 and payment_id = $2
           limit 1`,
          [input.organizationId, input.paymentId]
        );

        if (existingApplicationResult.rows[0]) {
          const existingInvoiceResult = await tx.query<InvoiceRow>(
            `select
               id, organization_id, lease_id, tenant_id, property_id, unit_id,
               invoice_year, invoice_sequence, invoice_number, invoice_type, period,
               issue_date, due_date, currency_code, total_amount, amount_paid,
               status, paid_at, email_status, email_sent_count, last_emailed_at,
               last_email_error, void_reason, voided_at, source_payment_id, created_at
             from invoices
             where id = $1 and organization_id = $2
             limit 1`,
            [existingApplicationResult.rows[0].invoice_id, input.organizationId]
          );

          if (!existingInvoiceResult.rows[0]) {
            throw new Error("INVOICE_NOT_FOUND_FOR_APPLICATION");
          }

          return {
            invoice: mapInvoice(existingInvoiceResult.rows[0]),
            appliedAmount: 0,
            creditCreatedAmount: 0,
            queuedEmailJob: false
          };
        }

        const leaseContextResult = await tx.query<LeaseContextRow>(
          `select u.property_id, l.unit_id
           from leases l
           join units u on u.id = l.unit_id
           where l.id = $1 and l.organization_id = $2
           limit 1`,
          [input.leaseId, input.organizationId]
        );

        if (!leaseContextResult.rows[0]) {
          throw new Error("LEASE_CONTEXT_NOT_FOUND");
        }

        const leaseContext = leaseContextResult.rows[0];

        const existingInvoiceResult = await tx.query<InvoiceRow>(
          input.period
            ? `select
                 id, organization_id, lease_id, tenant_id, property_id, unit_id,
                 invoice_year, invoice_sequence, invoice_number, invoice_type, period,
                 issue_date, due_date, currency_code, total_amount, amount_paid,
                 status, paid_at, email_status, email_sent_count, last_emailed_at,
                 last_email_error, void_reason, voided_at, source_payment_id, created_at
               from invoices
               where organization_id = $1
                 and lease_id = $2
                 and period = $3
                 and status <> 'void'
               limit 1`
            : `select
                 id, organization_id, lease_id, tenant_id, property_id, unit_id,
                 invoice_year, invoice_sequence, invoice_number, invoice_type, period,
                 issue_date, due_date, currency_code, total_amount, amount_paid,
                 status, paid_at, email_status, email_sent_count, last_emailed_at,
                 last_email_error, void_reason, voided_at, source_payment_id, created_at
               from invoices
               where organization_id = $1
                 and source_payment_id = $2
                 and status <> 'void'
               limit 1`,
          input.period
            ? [input.organizationId, input.leaseId, input.period]
            : [input.organizationId, input.paymentId]
        );

        let invoiceRow = existingInvoiceResult.rows[0] ?? null;

        if (!invoiceRow) {
          const invoiceYear = getYearFromIsoDate(input.dueDate);
          await tx.query(
            `select pg_advisory_xact_lock(hashtext($1 || ':' || $2::text))`,
            [input.organizationId, invoiceYear]
          );

          const sequenceResult = await tx.query<{ next_sequence: number }>(
            `select coalesce(max(invoice_sequence), 0) + 1 as next_sequence
             from invoices
             where organization_id = $1 and invoice_year = $2`,
            [input.organizationId, invoiceYear]
          );

          const invoiceSequence = sequenceResult.rows[0]?.next_sequence ?? 1;
          const invoiceNumber = buildInvoiceNumber(invoiceYear, invoiceSequence);

          const createdInvoiceResult = await tx.query<InvoiceRow>(
            `insert into invoices (
               id, organization_id, lease_id, tenant_id, property_id, unit_id,
               invoice_year, invoice_sequence, invoice_number,
               invoice_type, period, issue_date, due_date,
               currency_code, total_amount, amount_paid, status,
               source_payment_id, email_status
             ) values (
               'inv_' || replace(gen_random_uuid()::text, '-', ''),
               $1, $2, $3, $4, $5,
               $6, $7, $8,
               $9, $10, $11, $12,
               $13, $14, 0, 'issued',
               $15, 'not_sent'
             )
             returning
               id, organization_id, lease_id, tenant_id, property_id, unit_id,
               invoice_year, invoice_sequence, invoice_number, invoice_type, period,
               issue_date, due_date, currency_code, total_amount, amount_paid,
               status, paid_at, email_status, email_sent_count, last_emailed_at,
               last_email_error, void_reason, voided_at, source_payment_id, created_at`,
            [
              input.organizationId,
              input.leaseId,
              input.tenantId,
              leaseContext.property_id,
              leaseContext.unit_id,
              invoiceYear,
              invoiceSequence,
              invoiceNumber,
              input.period ? "monthly" : "one_time",
              input.period,
              input.dueDate,
              input.dueDate,
              input.currencyCode,
              input.amount,
              input.paymentId
            ]
          );

          invoiceRow = createdInvoiceResult.rows[0] ?? null;
        }

        if (!invoiceRow) {
          throw new Error("INVOICE_CREATE_FAILED");
        }

        const invoiceTotal = toNumber(invoiceRow.total_amount);
        const invoicePaid = toNumber(invoiceRow.amount_paid);
        const remaining = Math.max(0, invoiceTotal - invoicePaid);
        const appliedAmount = Math.min(input.amount, remaining);
        const creditCreatedAmount = Math.max(0, input.amount - appliedAmount);

        if (appliedAmount > 0) {
          const newAmountPaid = Math.min(invoiceTotal, invoicePaid + appliedAmount);
          const nextStatus = newAmountPaid >= invoiceTotal
            ? "paid"
            : newAmountPaid > 0
              ? "partial"
              : "issued";

          const updatedInvoiceResult = await tx.query<InvoiceRow>(
            `update invoices
             set amount_paid = $3,
                 status = $4,
                 paid_at = case when $4 = 'paid' and paid_at is null then $5 else paid_at end
             where id = $1 and organization_id = $2
             returning
               id, organization_id, lease_id, tenant_id, property_id, unit_id,
               invoice_year, invoice_sequence, invoice_number, invoice_type, period,
               issue_date, due_date, currency_code, total_amount, amount_paid,
               status, paid_at, email_status, email_sent_count, last_emailed_at,
               last_email_error, void_reason, voided_at, source_payment_id, created_at`,
            [invoiceRow.id, input.organizationId, newAmountPaid, nextStatus, input.paidDate]
          );

          invoiceRow = updatedInvoiceResult.rows[0] ?? invoiceRow;

          await tx.query(
            `insert into invoice_payment_applications (
               id, organization_id, invoice_id, payment_id, applied_amount
             ) values (
               'iap_' || replace(gen_random_uuid()::text, '-', ''),
               $1, $2, $3, $4
             )`,
            [input.organizationId, invoiceRow.id, input.paymentId, appliedAmount]
          );
        }

        if (creditCreatedAmount > 0) {
          await tx.query(
            `insert into lease_credit_balances (
               id, organization_id, lease_id, currency_code, credit_amount, updated_at
             ) values (
               'crd_' || replace(gen_random_uuid()::text, '-', ''),
               $1, $2, $3, $4, now()
             )
             on conflict (organization_id, lease_id, currency_code)
             do update set
               credit_amount = lease_credit_balances.credit_amount + excluded.credit_amount,
               updated_at = now()`,
            [input.organizationId, input.leaseId, input.currencyCode, creditCreatedAmount]
          );
        }

        let queuedEmailJob = false;
        const mappedInvoice = mapInvoice(invoiceRow);
        if (mappedInvoice.status === "paid" && (mappedInvoice.emailStatus === "not_sent" || mappedInvoice.emailStatus === "failed")) {
          await tx.query(
            `insert into invoice_email_jobs (
               id, organization_id, invoice_id, job_kind, status, attempt_count, max_attempts, next_attempt_at
             ) values (
               'iej_' || replace(gen_random_uuid()::text, '-', ''),
               $1, $2, 'auto_on_paid', 'queued', 0, 3, now()
             )`,
            [input.organizationId, mappedInvoice.id]
          );

          await tx.query(
            `update invoices
             set email_status = 'queued', last_email_error = null
             where id = $1 and organization_id = $2`,
            [mappedInvoice.id, input.organizationId]
          );

          queuedEmailJob = true;

          const refreshedInvoiceResult = await tx.query<InvoiceRow>(
            `select
               id, organization_id, lease_id, tenant_id, property_id, unit_id,
               invoice_year, invoice_sequence, invoice_number, invoice_type, period,
               issue_date, due_date, currency_code, total_amount, amount_paid,
               status, paid_at, email_status, email_sent_count, last_emailed_at,
               last_email_error, void_reason, voided_at, source_payment_id, created_at
             from invoices
             where id = $1 and organization_id = $2
             limit 1`,
            [mappedInvoice.id, input.organizationId]
          );

          if (refreshedInvoiceResult.rows[0]) {
            return {
              invoice: mapInvoice(refreshedInvoiceResult.rows[0]),
              appliedAmount,
              creditCreatedAmount,
              queuedEmailJob
            };
          }
        }

        return {
          invoice: mapInvoice(invoiceRow),
          appliedAmount,
          creditCreatedAmount,
          queuedEmailJob
        };
      });
    },

    async claimProcessableEmailJobs(limit: number): Promise<ProcessableInvoiceEmailJob[]> {
      if (limit <= 0) {
        return [];
      }

      return withTransaction(client, async (tx) => {
        const claimedResult = await tx.query<InvoiceEmailJobRow>(
          `with candidates as (
             select id
             from invoice_email_jobs
             where status = 'queued'
               and next_attempt_at <= now()
             order by created_at asc
             limit $1
             for update skip locked
           )
           update invoice_email_jobs jobs
           set status = 'processing', locked_at = now(), updated_at = now()
           from candidates
           where jobs.id = candidates.id
           returning
             jobs.id, jobs.organization_id, jobs.invoice_id, jobs.job_kind, jobs.status,
             jobs.attempt_count, jobs.max_attempts, jobs.next_attempt_at, jobs.last_error,
             jobs.locked_at, jobs.created_at, jobs.updated_at`,
          [limit]
        );

        if (claimedResult.rows.length === 0) {
          return [];
        }

        const hydrated: ProcessableInvoiceEmailJob[] = [];

        for (const jobRow of claimedResult.rows) {
          const invoiceResult = await tx.query<InvoiceRow>(
            `select
               id, organization_id, lease_id, tenant_id, property_id, unit_id,
               invoice_year, invoice_sequence, invoice_number, invoice_type, period,
               issue_date, due_date, currency_code, total_amount, amount_paid,
               status, paid_at, email_status, email_sent_count, last_emailed_at,
               last_email_error, void_reason, voided_at, source_payment_id, created_at
             from invoices
             where id = $1 and organization_id = $2
             limit 1`,
            [jobRow.invoice_id, jobRow.organization_id]
          );

          const invoiceRow = invoiceResult.rows[0];
          if (!invoiceRow) {
            continue;
          }

          const tenantResult = await tx.query<TenantEmailRow>(
            `select email as tenant_email, full_name as tenant_full_name
             from tenants
             where id = $1 and organization_id = $2
             limit 1`,
            [invoiceRow.tenant_id, invoiceRow.organization_id]
          );

          const tenant = tenantResult.rows[0];
          if (!tenant?.tenant_email) {
            continue;
          }

          hydrated.push({
            job: mapEmailJob(jobRow),
            invoice: mapInvoice(invoiceRow),
            tenantEmail: tenant.tenant_email,
            tenantFullName: tenant.tenant_full_name
          });
        }

        return hydrated;
      });
    },

    async markEmailJobSent(jobId: string, organizationId: string): Promise<void> {
      await withTransaction(client, async (tx) => {
        const updateJobResult = await tx.query<InvoiceEmailJobRow>(
          `update invoice_email_jobs
           set status = 'sent',
               attempt_count = attempt_count + 1,
               locked_at = null,
               last_error = null,
               updated_at = now()
           where id = $1 and organization_id = $2
           returning
             id, organization_id, invoice_id, job_kind, status, attempt_count,
             max_attempts, next_attempt_at, last_error, locked_at, created_at, updated_at`,
          [jobId, organizationId]
        );

        const job = updateJobResult.rows[0];
        if (!job) {
          return;
        }

        await tx.query(
          `update invoices
           set email_status = 'sent',
               email_sent_count = email_sent_count + 1,
               last_emailed_at = now(),
               last_email_error = null
           where id = $1 and organization_id = $2`,
          [job.invoice_id, job.organization_id]
        );
      });
    },

    async markEmailJobFailed(jobId: string, organizationId: string, errorMessage: string): Promise<void> {
      await withTransaction(client, async (tx) => {
        const updateJobResult = await tx.query<InvoiceEmailJobRow>(
          `update invoice_email_jobs
           set attempt_count = attempt_count + 1,
               status = case when attempt_count + 1 >= max_attempts then 'failed' else 'queued' end,
               next_attempt_at = case when attempt_count + 1 >= max_attempts then next_attempt_at else now() + interval '5 minutes' end,
               last_error = $3,
               locked_at = null,
               updated_at = now()
           where id = $1 and organization_id = $2
           returning
             id, organization_id, invoice_id, job_kind, status, attempt_count,
             max_attempts, next_attempt_at, last_error, locked_at, created_at, updated_at`,
          [jobId, organizationId, errorMessage.slice(0, 1000)]
        );

        const job = updateJobResult.rows[0];
        if (!job) {
          return;
        }

        await tx.query(
          `update invoices
           set email_status = 'failed',
               last_email_error = $3
           where id = $1 and organization_id = $2`,
          [job.invoice_id, job.organization_id, errorMessage.slice(0, 1000)]
        );
      });
    },

    async releaseProcessingEmailJob(jobId: string, organizationId: string): Promise<void> {
      await client.query(
        `update invoice_email_jobs
         set status = 'queued', locked_at = null, updated_at = now()
         where id = $1 and organization_id = $2 and status = 'processing'`,
        [jobId, organizationId]
      );
    }
  };
}

export function createInvoiceRepositoryFromEnv(env: DatabaseEnvSource): InvoiceRepository {
  const envResult = readDatabaseEnv(env);
  if (!envResult.success) {
    throw new Error(envResult.error);
  }

  const pool = getOrCreatePool(envResult.data.connectionString);
  return createPostgresInvoiceRepository(pool);
}
