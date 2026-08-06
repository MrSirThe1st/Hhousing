import { randomUUID } from "crypto";
import { Pool, type QueryResultRow } from "pg";
import type { DatabaseEnvSource } from "../database/database-env";
import { readDatabaseEnv } from "../database/database-env";
import type {
  AdminBillingDashboard,
  ConfirmPlatformInvoicePaidInput,
  CreatePlatformSubscriptionInvoiceInput,
  GenerateSaasInvoicesResult,
  ListPlatformSubscriptionInvoicesInput,
  PlatformBillingRepository,
  PlatformSubscriptionInvoiceListItem,
  UpdatePlatformBillingSettingsInput,
  VoidPlatformInvoiceInput
} from "./platform-billing-record.types";
import type {
  OrganizationUsageSnapshot,
  PlatformBillingEstimate,
  PlatformBillingSettings,
  PlatformSubscriptionInvoice,
  PlatformSubscriptionInvoiceStatus
} from "@hhousing/domain";

interface SettingsRow extends QueryResultRow {
  id: string;
  pricePerUnitAmount: string | number;
  currencyCode: string;
  freePropertyThreshold: number;
  updatedAtIso: string;
}

interface InvoiceRow extends QueryResultRow {
  id: string;
  organizationId: string;
  period: string;
  propertyCount: number;
  unitCount: number;
  pricePerUnitAmount: string | number;
  amountDue: string | number;
  currencyCode: string;
  status: PlatformSubscriptionInvoiceStatus;
  dueAtIso: string;
  issuedAtIso: string;
  paidAtIso: string | null;
  paidConfirmedByUserId: string | null;
  voidReason: string | null;
  createdAtIso: string;
  updatedAtIso: string;
  organizationName?: string;
}

interface UsageRow extends QueryResultRow {
  organizationId: string;
  propertyCount: string | number;
  unitCount: string | number;
}

function toNumber(value: string | number): number {
  return typeof value === "number" ? value : Number(value);
}

function mapSettings(row: SettingsRow): PlatformBillingSettings {
  return {
    id: row.id,
    pricePerUnitAmount: toNumber(row.pricePerUnitAmount),
    currencyCode: row.currencyCode,
    freePropertyThreshold: row.freePropertyThreshold,
    updatedAtIso: row.updatedAtIso
  };
}

function mapInvoice(row: InvoiceRow): PlatformSubscriptionInvoice {
  return {
    id: row.id,
    organizationId: row.organizationId,
    period: row.period,
    propertyCount: row.propertyCount,
    unitCount: row.unitCount,
    pricePerUnitAmount: toNumber(row.pricePerUnitAmount),
    amountDue: toNumber(row.amountDue),
    currencyCode: row.currencyCode,
    status: row.status,
    dueAtIso: row.dueAtIso,
    issuedAtIso: row.issuedAtIso,
    paidAtIso: row.paidAtIso,
    paidConfirmedByUserId: row.paidConfirmedByUserId,
    voidReason: row.voidReason,
    createdAtIso: row.createdAtIso,
    updatedAtIso: row.updatedAtIso
  };
}

function mapInvoiceListItem(row: InvoiceRow): PlatformSubscriptionInvoiceListItem {
  return {
    ...mapInvoice(row),
    organizationName: row.organizationName ?? row.organizationId
  };
}

function mapUsage(row: UsageRow): OrganizationUsageSnapshot {
  return {
    organizationId: row.organizationId,
    propertyCount: Number(row.propertyCount),
    unitCount: Number(row.unitCount)
  };
}

function computeEstimate(
  usage: OrganizationUsageSnapshot,
  settings: PlatformBillingSettings
): PlatformBillingEstimate {
  const isFreeTier = usage.propertyCount < settings.freePropertyThreshold;
  const amountDue = isFreeTier ? 0 : usage.unitCount * settings.pricePerUnitAmount;
  return {
    organizationId: usage.organizationId,
    propertyCount: usage.propertyCount,
    unitCount: usage.unitCount,
    pricePerUnitAmount: settings.pricePerUnitAmount,
    currencyCode: settings.currencyCode,
    freePropertyThreshold: settings.freePropertyThreshold,
    isFreeTier,
    amountDue
  };
}

const INVOICE_SELECT = `
  inv.id,
  inv.organization_id as "organizationId",
  inv.period,
  inv.property_count as "propertyCount",
  inv.unit_count as "unitCount",
  inv.price_per_unit_amount as "pricePerUnitAmount",
  inv.amount_due as "amountDue",
  inv.currency_code as "currencyCode",
  inv.status,
  inv.due_at as "dueAtIso",
  inv.issued_at as "issuedAtIso",
  inv.paid_at as "paidAtIso",
  inv.paid_confirmed_by_user_id::text as "paidConfirmedByUserId",
  inv.void_reason as "voidReason",
  inv.created_at as "createdAtIso",
  inv.updated_at as "updatedAtIso"
`;

export function createPostgresPlatformBillingRepository(pool: Pool): PlatformBillingRepository {
  return {
    async getBillingSettings(): Promise<PlatformBillingSettings> {
      const result = await pool.query<SettingsRow>(
        `select
           id,
           price_per_unit_amount as "pricePerUnitAmount",
           currency_code as "currencyCode",
           free_property_threshold as "freePropertyThreshold",
           updated_at as "updatedAtIso"
         from platform_billing_settings
         where id = 'default'
         limit 1`
      );
      const row = result.rows[0];
      if (!row) {
        throw new Error("platform_billing_settings row missing");
      }
      return mapSettings(row);
    },

    async updateBillingSettings(input: UpdatePlatformBillingSettingsInput): Promise<PlatformBillingSettings> {
      const result = await pool.query<SettingsRow>(
        `update platform_billing_settings
         set
           price_per_unit_amount = $1,
           currency_code = coalesce($2, currency_code),
           free_property_threshold = $3,
           updated_at = now()
         where id = 'default'
         returning
           id,
           price_per_unit_amount as "pricePerUnitAmount",
           currency_code as "currencyCode",
           free_property_threshold as "freePropertyThreshold",
           updated_at as "updatedAtIso"`,
        [input.pricePerUnitAmount, input.currencyCode ?? null, input.freePropertyThreshold]
      );
      const row = result.rows[0];
      if (!row) {
        throw new Error("platform_billing_settings row missing");
      }
      return mapSettings(row);
    },

    async getOrganizationUsage(organizationId: string): Promise<OrganizationUsageSnapshot | null> {
      const result = await pool.query<UsageRow>(
        `select
           o.id as "organizationId",
           (select count(*)::int from properties p where p.organization_id = o.id) as "propertyCount",
           (select count(*)::int from units u
              join properties p on p.id = u.property_id
              where p.organization_id = o.id) as "unitCount"
         from organizations o
         where o.id = $1`,
        [organizationId]
      );
      const row = result.rows[0];
      return row ? mapUsage(row) : null;
    },

    async listOrganizationUsage(): Promise<OrganizationUsageSnapshot[]> {
      const result = await pool.query<UsageRow>(
        `select
           o.id as "organizationId",
           (select count(*)::int from properties p where p.organization_id = o.id) as "propertyCount",
           (select count(*)::int from units u
              join properties p on p.id = u.property_id
              where p.organization_id = o.id) as "unitCount"
         from organizations o
         where o.status = 'active'
         order by o.created_at asc`
      );
      return result.rows.map(mapUsage);
    },

    async estimateOrganizationBilling(organizationId: string): Promise<PlatformBillingEstimate | null> {
      const usage = await this.getOrganizationUsage(organizationId);
      if (!usage) return null;
      const settings = await this.getBillingSettings();
      return computeEstimate(usage, settings);
    },

    async getAdminBillingDashboard(): Promise<AdminBillingDashboard> {
      const settings = await this.getBillingSettings();
      const result = await pool.query<{
        openReceivableAmount: string | number;
        openInvoiceCount: number;
        overdueReceivableAmount: string | number;
        overdueInvoiceCount: number;
        collectedMonthAmount: string | number;
        collectedMonthCount: number;
        collectedYearAmount: string | number;
      }>(
        `select
           coalesce((
             select sum(amount_due) from platform_subscription_invoices
             where status = 'issued'
           ), 0) as "openReceivableAmount",
           (
             select count(*)::int from platform_subscription_invoices
             where status = 'issued'
           ) as "openInvoiceCount",
           coalesce((
             select sum(amount_due) from platform_subscription_invoices
             where status = 'issued' and due_at < now()
           ), 0) as "overdueReceivableAmount",
           (
             select count(*)::int from platform_subscription_invoices
             where status = 'issued' and due_at < now()
           ) as "overdueInvoiceCount",
           coalesce((
             select sum(amount_due) from platform_subscription_invoices
             where status = 'paid'
               and paid_at >= date_trunc('month', now())
               and paid_at < date_trunc('month', now()) + interval '1 month'
           ), 0) as "collectedMonthAmount",
           (
             select count(*)::int from platform_subscription_invoices
             where status = 'paid'
               and paid_at >= date_trunc('month', now())
               and paid_at < date_trunc('month', now()) + interval '1 month'
           ) as "collectedMonthCount",
           coalesce((
             select sum(amount_due) from platform_subscription_invoices
             where status = 'paid'
               and paid_at >= date_trunc('year', now())
               and paid_at < date_trunc('year', now()) + interval '1 year'
           ), 0) as "collectedYearAmount"`
      );
      const row = result.rows[0];
      return {
        currencyCode: settings.currencyCode,
        openReceivableAmount: toNumber(row?.openReceivableAmount ?? 0),
        openInvoiceCount: row?.openInvoiceCount ?? 0,
        overdueReceivableAmount: toNumber(row?.overdueReceivableAmount ?? 0),
        overdueInvoiceCount: row?.overdueInvoiceCount ?? 0,
        collectedMonthAmount: toNumber(row?.collectedMonthAmount ?? 0),
        collectedMonthCount: row?.collectedMonthCount ?? 0,
        collectedYearAmount: toNumber(row?.collectedYearAmount ?? 0)
      };
    },

    async listInvoices(
      input: ListPlatformSubscriptionInvoicesInput = {}
    ): Promise<PlatformSubscriptionInvoiceListItem[]> {
      const limit = Math.min(input.limit ?? 50, 200);
      const offset = input.offset ?? 0;
      const overdueOnly = input.overdueOnly === true;
      const status = overdueOnly ? "issued" : (input.status ?? null);

      let orderBy = "inv.period desc, inv.issued_at desc";
      if (overdueOnly || status === "issued") {
        orderBy = "inv.due_at asc, inv.period desc";
      } else if (status === "paid") {
        orderBy = "inv.paid_at desc nulls last, inv.period desc";
      }

      const result = await pool.query<InvoiceRow>(
        `select
           ${INVOICE_SELECT},
           o.name as "organizationName"
         from platform_subscription_invoices inv
         join organizations o on o.id = inv.organization_id
         where ($1::text is null or inv.organization_id = $1)
           and ($2::text is null or inv.period = $2)
           and ($3::text is null or inv.status = $3)
           and (
             $4::text is null
             or o.name ilike '%' || $4 || '%'
             or inv.organization_id ilike '%' || $4 || '%'
           )
           and ($5::boolean = false or (inv.status = 'issued' and inv.due_at < now()))
         order by ${orderBy}
         limit $6 offset $7`,
        [
          input.organizationId ?? null,
          input.period ?? null,
          status,
          input.search?.trim() || null,
          overdueOnly,
          limit,
          offset
        ]
      );
      return result.rows.map(mapInvoiceListItem);
    },

    async getInvoiceById(invoiceId: string): Promise<PlatformSubscriptionInvoiceListItem | null> {
      const result = await pool.query<InvoiceRow>(
        `select
           ${INVOICE_SELECT},
           o.name as "organizationName"
         from platform_subscription_invoices inv
         join organizations o on o.id = inv.organization_id
         where inv.id = $1
         limit 1`,
        [invoiceId]
      );
      const row = result.rows[0];
      return row ? mapInvoiceListItem(row) : null;
    },

    async listInvoicesForOrganization(
      organizationId: string,
      limit = 24
    ): Promise<PlatformSubscriptionInvoice[]> {
      const result = await pool.query<InvoiceRow>(
        `select ${INVOICE_SELECT}
         from platform_subscription_invoices inv
         where inv.organization_id = $1
         order by inv.period desc
         limit $2`,
        [organizationId, limit]
      );
      return result.rows.map(mapInvoice);
    },

    async getOpenOverdueInvoiceForOrganization(
      organizationId: string
    ): Promise<PlatformSubscriptionInvoice | null> {
      const result = await pool.query<InvoiceRow>(
        `select ${INVOICE_SELECT}
         from platform_subscription_invoices inv
         where inv.organization_id = $1
           and inv.status = 'issued'
           and inv.due_at < now()
         order by inv.due_at asc
         limit 1`,
        [organizationId]
      );
      const row = result.rows[0];
      return row ? mapInvoice(row) : null;
    },

    async createInvoiceIfAbsent(
      input: CreatePlatformSubscriptionInvoiceInput
    ): Promise<"created" | "exists"> {
      const result = await pool.query(
        `insert into platform_subscription_invoices (
           id, organization_id, period, property_count, unit_count,
           price_per_unit_amount, amount_due, currency_code, status, due_at
         ) values ($1, $2, $3, $4, $5, $6, $7, $8, 'issued', $9::timestamptz)
         on conflict (organization_id, period) do nothing`,
        [
          input.id,
          input.organizationId,
          input.period,
          input.propertyCount,
          input.unitCount,
          input.pricePerUnitAmount,
          input.amountDue,
          input.currencyCode,
          input.dueAtIso
        ]
      );
      return (result.rowCount ?? 0) > 0 ? "created" : "exists";
    },

    async confirmInvoicePaid(
      input: ConfirmPlatformInvoicePaidInput
    ): Promise<PlatformSubscriptionInvoice | null> {
      const result = await pool.query<InvoiceRow>(
        `update platform_subscription_invoices as inv
         set
           status = 'paid',
           paid_at = now(),
           paid_confirmed_by_user_id = $2::uuid,
           updated_at = now()
         where inv.id = $1
           and inv.status = 'issued'
         returning ${INVOICE_SELECT}`,
        [input.invoiceId, input.confirmedByUserId]
      );
      const row = result.rows[0];
      return row ? mapInvoice(row) : null;
    },

    async voidInvoice(input: VoidPlatformInvoiceInput): Promise<PlatformSubscriptionInvoice | null> {
      const result = await pool.query<InvoiceRow>(
        `update platform_subscription_invoices as inv
         set
           status = 'void',
           void_reason = $2,
           updated_at = now()
         where inv.id = $1
           and inv.status = 'issued'
         returning ${INVOICE_SELECT}`,
        [input.invoiceId, input.voidReason ?? null]
      );
      const row = result.rows[0];
      return row ? mapInvoice(row) : null;
    },

    async generateInvoicesForPeriod(period: string, dueAtIso: string): Promise<GenerateSaasInvoicesResult> {
      const settings = await this.getBillingSettings();
      const usages = await this.listOrganizationUsage();
      const result: GenerateSaasInvoicesResult = {
        period,
        created: 0,
        skippedFree: 0,
        skippedExisting: 0,
        failures: [],
        invoiceIds: []
      };

      for (const usage of usages) {
        try {
          const estimate = computeEstimate(usage, settings);
          if (estimate.isFreeTier || estimate.amountDue <= 0) {
            result.skippedFree += 1;
            continue;
          }

          const id = randomUUID();
          const outcome = await this.createInvoiceIfAbsent({
            id,
            organizationId: usage.organizationId,
            period,
            propertyCount: estimate.propertyCount,
            unitCount: estimate.unitCount,
            pricePerUnitAmount: estimate.pricePerUnitAmount,
            amountDue: estimate.amountDue,
            currencyCode: estimate.currencyCode,
            dueAtIso
          });

          if (outcome === "created") {
            result.created += 1;
            result.invoiceIds.push(id);
          } else {
            result.skippedExisting += 1;
          }
        } catch (error) {
          result.failures.push({
            organizationId: usage.organizationId,
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }

      return result;
    }
  };
}

const poolCache = new Map<string, Pool>();

function getOrCreatePool(connectionString: string): Pool {
  const cached = poolCache.get(connectionString);
  if (cached) {
    return cached;
  }
  const pool = new Pool({ connectionString, max: 5 });
  poolCache.set(connectionString, pool);
  return pool;
}

export function createPlatformBillingRepositoryFromEnv(
  env: DatabaseEnvSource = process.env
): PlatformBillingRepository {
  const envResult = readDatabaseEnv(env);
  if (envResult.success === false) {
    throw new Error(envResult.error);
  }

  return createPostgresPlatformBillingRepository(getOrCreatePool(envResult.data.connectionString));
}
