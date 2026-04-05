import { Pool, type QueryResultRow } from "pg";
import type {
  GetTenantConversationDetailOutput,
  GetManagerConversationDetailOutput,
  ListManagerConversationsFilter,
  ManagerConversationContext,
  ManagerConversationListItem,
  TenantConversationContext,
  TenantConversationListItem
} from "@hhousing/api-contracts";
import type { LeaseStatus, Message, MessageSenderSide } from "@hhousing/domain";
import { readDatabaseEnv, type DatabaseEnvSource } from "../database/database-env";
import type {
  MessageRepository,
  SendManagerMessageRecordInput,
  SendTenantMessageRecordInput,
  StartManagerConversationRecordInput
} from "./message-record.types";

interface ConversationListRow extends QueryResultRow {
  conversation_id: string;
  tenant_id: string;
  tenant_name: string;
  property_id: string;
  property_name: string;
  unit_id: string;
  unit_number: string;
  lease_id: string | null;
  last_message_preview: string;
  last_message_at: Date | string;
  unread_count: number | string;
}

interface TenantConversationListRow extends QueryResultRow {
  conversation_id: string;
  organization_name: string;
  property_id: string;
  property_name: string;
  unit_id: string;
  unit_number: string;
  lease_id: string | null;
  last_message_preview: string;
  last_message_at: Date | string;
}

interface MessageRow extends QueryResultRow {
  id: string;
  organization_id: string;
  conversation_id: string;
  sender_side: MessageSenderSide;
  sender_user_id: string | null;
  body: string;
  created_at: Date | string;
}

interface ContextRow extends QueryResultRow {
  tenant_id: string;
  tenant_full_name: string;
  tenant_email: string | null;
  tenant_phone: string | null;
  unit_id: string;
  unit_number: string;
  property_id: string;
  property_name: string;
  lease_id: string | null;
  lease_start_date: Date | string | null;
  lease_end_date: Date | string | null;
  lease_monthly_rent_amount: string | number | null;
  lease_currency_code: string | null;
  lease_status: LeaseStatus | null;
}

interface TenantContextRow extends QueryResultRow {
  unit_id: string;
  unit_number: string;
  property_id: string;
  property_name: string;
  lease_id: string | null;
  lease_start_date: Date | string | null;
  lease_end_date: Date | string | null;
  lease_monthly_rent_amount: string | number | null;
  lease_currency_code: string | null;
  lease_status: LeaseStatus | null;
}

interface ResolveUnitRow extends QueryResultRow {
  unit_id: string;
  lease_id: string | null;
}

interface ConversationIdRow extends QueryResultRow {
  id: string;
}

export interface MessageQueryable {
  query<Row extends QueryResultRow>(
    text: string,
    values?: readonly unknown[]
  ): Promise<{ rows: Row[] }>;
}

const poolCache = new Map<string, Pool>();

function getOrCreatePool(connectionString: string): Pool {
  const existing = poolCache.get(connectionString);
  if (existing) return existing;
  const pool = new Pool({ connectionString, max: 5 });
  poolCache.set(connectionString, pool);
  return pool;
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function toDateOnly(value: Date | string): string {
  const iso = toIso(value);
  return iso.substring(0, 10);
}

function toNumber(value: string | number): number {
  return typeof value === "number" ? value : Number(value);
}

function mapConversationListRow(row: ConversationListRow): ManagerConversationListItem {
  return {
    conversationId: row.conversation_id,
    tenantId: row.tenant_id,
    tenantName: row.tenant_name,
    propertyId: row.property_id,
    propertyName: row.property_name,
    unitId: row.unit_id,
    unitNumber: row.unit_number,
    leaseId: row.lease_id,
    lastMessagePreview: row.last_message_preview,
    lastMessageAtIso: toIso(row.last_message_at),
    unreadCount: Number(row.unread_count)
  };
}

function mapTenantConversationListRow(row: TenantConversationListRow): TenantConversationListItem {
  return {
    conversationId: row.conversation_id,
    organizationName: row.organization_name,
    propertyId: row.property_id,
    propertyName: row.property_name,
    unitId: row.unit_id,
    unitNumber: row.unit_number,
    leaseId: row.lease_id,
    lastMessagePreview: row.last_message_preview,
    lastMessageAtIso: toIso(row.last_message_at)
  };
}

function mapMessageRow(row: MessageRow): Message {
  return {
    id: row.id,
    organizationId: row.organization_id,
    conversationId: row.conversation_id,
    senderSide: row.sender_side,
    senderUserId: row.sender_user_id,
    body: row.body,
    createdAtIso: toIso(row.created_at)
  };
}

function mapContextRow(row: ContextRow): ManagerConversationContext {
  return {
    tenant: {
      id: row.tenant_id,
      fullName: row.tenant_full_name,
      email: row.tenant_email,
      phone: row.tenant_phone
    },
    unit: {
      id: row.unit_id,
      unitNumber: row.unit_number,
      propertyId: row.property_id,
      propertyName: row.property_name
    },
    lease: row.lease_id
      ? {
          id: row.lease_id,
          startDate: row.lease_start_date ? toDateOnly(row.lease_start_date) : "",
          endDate: row.lease_end_date ? toDateOnly(row.lease_end_date) : null,
          monthlyRentAmount:
            row.lease_monthly_rent_amount === null ? 0 : toNumber(row.lease_monthly_rent_amount),
          currencyCode: row.lease_currency_code ?? "USD",
          status: row.lease_status ?? "pending"
        }
      : null
  };
}

function mapTenantContextRow(row: TenantContextRow): TenantConversationContext {
  return {
    unit: {
      id: row.unit_id,
      unitNumber: row.unit_number,
      propertyId: row.property_id,
      propertyName: row.property_name
    },
    lease: row.lease_id
      ? {
          id: row.lease_id,
          startDate: row.lease_start_date ? toDateOnly(row.lease_start_date) : "",
          endDate: row.lease_end_date ? toDateOnly(row.lease_end_date) : null,
          monthlyRentAmount:
            row.lease_monthly_rent_amount === null ? 0 : toNumber(row.lease_monthly_rent_amount),
          currencyCode: row.lease_currency_code ?? "USD",
          status: row.lease_status ?? "pending"
        }
      : null
  };
}

async function resolveTenantUnitAndLease(
  client: MessageQueryable,
  organizationId: string,
  tenantId: string,
  explicitUnitId?: string
): Promise<ResolveUnitRow | null> {
  if (explicitUnitId) {
    const validationResult = await client.query<QueryResultRow>(
      `select 1
       from tenants t
       join units u on u.organization_id = t.organization_id
       where t.id = $1 and t.organization_id = $2 and u.id = $3 and u.organization_id = $2`,
      [tenantId, organizationId, explicitUnitId]
    );

    if (validationResult.rows.length === 0) {
      return null;
    }

    const leaseResult = await client.query<ResolveUnitRow>(
      `select l.unit_id, l.id as lease_id
       from leases l
       where l.organization_id = $1
         and l.tenant_id = $2
         and l.unit_id = $3
         and l.status in ('active', 'pending')
       order by
         case when l.status = 'active' then 0 else 1 end,
         l.start_date desc
       limit 1`,
      [organizationId, tenantId, explicitUnitId]
    );

    if (leaseResult.rows[0]) {
      return leaseResult.rows[0];
    }

    return { unit_id: explicitUnitId, lease_id: null };
  }

  const result = await client.query<ResolveUnitRow>(
    `select l.unit_id, l.id as lease_id
     from leases l
     where l.organization_id = $1
       and l.tenant_id = $2
       and l.status in ('active', 'pending')
     order by
       case when l.status = 'active' then 0 else 1 end,
       l.start_date desc
     limit 1`,
    [organizationId, tenantId]
  );

  return result.rows[0] ?? null;
}

export function createPostgresMessageRepository(client: MessageQueryable): MessageRepository {
  return {
    async listManagerConversations(
      filter: ListManagerConversationsFilter
    ): Promise<ManagerConversationListItem[]> {
      const propertyId = filter.propertyId ?? null;
      const q = filter.q ?? null;

      const result = await client.query<ConversationListRow>(
        `select
           c.id as conversation_id,
           c.tenant_id,
           t.full_name as tenant_name,
           p.id as property_id,
           p.name as property_name,
           u.id as unit_id,
           u.unit_number,
           c.lease_id,
           lm.body as last_message_preview,
           lm.created_at as last_message_at,
           (
             select count(*)::int
             from messages m2
             where m2.conversation_id = c.id
               and m2.sender_side = 'tenant'
               and (c.manager_last_read_at is null or m2.created_at > c.manager_last_read_at)
           ) as unread_count
         from conversations c
         join tenants t on t.id = c.tenant_id and t.organization_id = c.organization_id
         join units u on u.id = c.unit_id and u.organization_id = c.organization_id
         join properties p on p.id = u.property_id and p.organization_id = c.organization_id
         join lateral (
           select m.body, m.created_at
           from messages m
           where m.conversation_id = c.id
           order by m.created_at desc
           limit 1
         ) lm on true
         where c.organization_id = $1
           and ($2::text is null or p.id = $2)
           and (
             $3::text is null
             or t.full_name ilike ('%' || $3 || '%')
             or u.unit_number ilike ('%' || $3 || '%')
             or p.name ilike ('%' || $3 || '%')
             or lm.body ilike ('%' || $3 || '%')
           )
         order by lm.created_at desc
         limit 200`,
        [filter.organizationId, propertyId, q]
      );

      return result.rows.map(mapConversationListRow);
    },

    async listTenantConversations(
      organizationId: string,
      tenantAuthUserId: string
    ): Promise<TenantConversationListItem[]> {
      const result = await client.query<TenantConversationListRow>(
        `select
           c.id as conversation_id,
            o.name as organization_name,
           p.id as property_id,
           p.name as property_name,
           u.id as unit_id,
           u.unit_number,
           c.lease_id,
           lm.body as last_message_preview,
           lm.created_at as last_message_at
         from conversations c
         join organizations o on o.id = c.organization_id
         join tenants t on t.id = c.tenant_id and t.organization_id = c.organization_id
         join units u on u.id = c.unit_id and u.organization_id = c.organization_id
         join properties p on p.id = u.property_id and p.organization_id = c.organization_id
         join lateral (
           select m.body, m.created_at
           from messages m
           where m.conversation_id = c.id
           order by m.created_at desc
           limit 1
         ) lm on true
         where c.organization_id = $1
           and t.auth_user_id = $2
         order by lm.created_at desc
         limit 200`,
        [organizationId, tenantAuthUserId]
      );

      return result.rows.map(mapTenantConversationListRow);
    },

    async getManagerConversationDetail(
      conversationId: string,
      organizationId: string
    ): Promise<GetManagerConversationDetailOutput | null> {
      const summaryResult = await client.query<ConversationListRow>(
        `select
           c.id as conversation_id,
           c.tenant_id,
           t.full_name as tenant_name,
           p.id as property_id,
           p.name as property_name,
           u.id as unit_id,
           u.unit_number,
           c.lease_id,
           lm.body as last_message_preview,
           lm.created_at as last_message_at,
           (
             select count(*)::int
             from messages m2
             where m2.conversation_id = c.id
               and m2.sender_side = 'tenant'
               and (c.manager_last_read_at is null or m2.created_at > c.manager_last_read_at)
           ) as unread_count
         from conversations c
         join tenants t on t.id = c.tenant_id and t.organization_id = c.organization_id
         join units u on u.id = c.unit_id and u.organization_id = c.organization_id
         join properties p on p.id = u.property_id and p.organization_id = c.organization_id
         join lateral (
           select m.body, m.created_at
           from messages m
           where m.conversation_id = c.id
           order by m.created_at desc
           limit 1
         ) lm on true
         where c.id = $1 and c.organization_id = $2`,
        [conversationId, organizationId]
      );

      const summary = summaryResult.rows[0];
      if (!summary) {
        return null;
      }

      const messagesResult = await client.query<MessageRow>(
        `select id, organization_id, conversation_id, sender_side, sender_user_id, body, created_at
         from messages
         where conversation_id = $1 and organization_id = $2
         order by created_at asc`,
        [conversationId, organizationId]
      );

      const contextResult = await client.query<ContextRow>(
        `select
           t.id as tenant_id,
           t.full_name as tenant_full_name,
           t.email as tenant_email,
           t.phone as tenant_phone,
           u.id as unit_id,
           u.unit_number,
           p.id as property_id,
           p.name as property_name,
           l.id as lease_id,
           l.start_date as lease_start_date,
           l.end_date as lease_end_date,
           l.monthly_rent_amount as lease_monthly_rent_amount,
           l.currency_code as lease_currency_code,
           l.status as lease_status
         from conversations c
         join tenants t on t.id = c.tenant_id and t.organization_id = c.organization_id
         join units u on u.id = c.unit_id and u.organization_id = c.organization_id
         join properties p on p.id = u.property_id and p.organization_id = c.organization_id
         left join leases l on l.id = c.lease_id and l.organization_id = c.organization_id
         where c.id = $1 and c.organization_id = $2`,
        [conversationId, organizationId]
      );

      const context = contextResult.rows[0];
      if (!context) {
        return null;
      }

      return {
        conversation: mapConversationListRow(summary),
        messages: messagesResult.rows.map(mapMessageRow),
        context: mapContextRow(context)
      };
    },

    async getTenantConversationDetail(
      conversationId: string,
      organizationId: string,
      tenantAuthUserId: string
    ): Promise<GetTenantConversationDetailOutput | null> {
      const summaryResult = await client.query<TenantConversationListRow>(
        `select
           c.id as conversation_id,
            o.name as organization_name,
           p.id as property_id,
           p.name as property_name,
           u.id as unit_id,
           u.unit_number,
           c.lease_id,
           lm.body as last_message_preview,
           lm.created_at as last_message_at
         from conversations c
         join organizations o on o.id = c.organization_id
         join tenants t on t.id = c.tenant_id and t.organization_id = c.organization_id
         join units u on u.id = c.unit_id and u.organization_id = c.organization_id
         join properties p on p.id = u.property_id and p.organization_id = c.organization_id
         join lateral (
           select m.body, m.created_at
           from messages m
           where m.conversation_id = c.id
           order by m.created_at desc
           limit 1
         ) lm on true
         where c.id = $1
           and c.organization_id = $2
           and t.auth_user_id = $3`,
        [conversationId, organizationId, tenantAuthUserId]
      );

      const summary = summaryResult.rows[0];
      if (!summary) {
        return null;
      }

      const messagesResult = await client.query<MessageRow>(
        `select id, organization_id, conversation_id, sender_side, sender_user_id, body, created_at
         from messages
         where conversation_id = $1 and organization_id = $2
         order by created_at asc`,
        [conversationId, organizationId]
      );

      const contextResult = await client.query<TenantContextRow>(
        `select
           u.id as unit_id,
           u.unit_number,
           p.id as property_id,
           p.name as property_name,
           l.id as lease_id,
           l.start_date as lease_start_date,
           l.end_date as lease_end_date,
           l.monthly_rent_amount as lease_monthly_rent_amount,
           l.currency_code as lease_currency_code,
           l.status as lease_status
         from conversations c
         join tenants t on t.id = c.tenant_id and t.organization_id = c.organization_id
         join units u on u.id = c.unit_id and u.organization_id = c.organization_id
         join properties p on p.id = u.property_id and p.organization_id = c.organization_id
         left join leases l on l.id = c.lease_id and l.organization_id = c.organization_id
         where c.id = $1
           and c.organization_id = $2
           and t.auth_user_id = $3`,
        [conversationId, organizationId, tenantAuthUserId]
      );

      const context = contextResult.rows[0];
      if (!context) {
        return null;
      }

      return {
        conversation: mapTenantConversationListRow(summary),
        messages: messagesResult.rows.map(mapMessageRow),
        context: mapTenantContextRow(context)
      };
    },

    async startManagerConversation(input: StartManagerConversationRecordInput): Promise<string | null> {
      await client.query("begin");

      try {
        const resolved = await resolveTenantUnitAndLease(
          client,
          input.organizationId,
          input.tenantId,
          input.unitId
        );

        if (!resolved) {
          await client.query("rollback");
          return null;
        }

        const conversationResult = await client.query<ConversationIdRow>(
          `insert into conversations (
             id,
             organization_id,
             tenant_id,
             unit_id,
             lease_id,
             updated_at
           ) values ($1, $2, $3, $4, $5, now())
           on conflict (organization_id, tenant_id, unit_id)
           do update set
             lease_id = coalesce(excluded.lease_id, conversations.lease_id),
             updated_at = now()
           returning id`,
          [
            input.conversationId,
            input.organizationId,
            input.tenantId,
            resolved.unit_id,
            resolved.lease_id
          ]
        );

        const conversation = conversationResult.rows[0];
        if (!conversation) {
          await client.query("rollback");
          return null;
        }

        await client.query(
          `insert into messages (
             id,
             organization_id,
             conversation_id,
             sender_side,
             sender_user_id,
             body
           ) values ($1, $2, $3, 'manager', $4, $5)`,
          [
            input.messageId,
            input.organizationId,
            conversation.id,
            input.senderUserId,
            input.body
          ]
        );

        await client.query(
          `update conversations
           set updated_at = now()
           where id = $1 and organization_id = $2`,
          [conversation.id, input.organizationId]
        );

        await client.query("commit");
        return conversation.id;
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    },

    async sendManagerMessage(input: SendManagerMessageRecordInput): Promise<Message | null> {
      const conversationExists = await client.query<ConversationIdRow>(
        `select id
         from conversations
         where id = $1 and organization_id = $2`,
        [input.conversationId, input.organizationId]
      );

      if (!conversationExists.rows[0]) {
        return null;
      }

      const result = await client.query<MessageRow>(
        `insert into messages (
           id,
           organization_id,
           conversation_id,
           sender_side,
           sender_user_id,
           body
         ) values ($1, $2, $3, 'manager', $4, $5)
         returning id, organization_id, conversation_id, sender_side, sender_user_id, body, created_at`,
        [
          input.messageId,
          input.organizationId,
          input.conversationId,
          input.senderUserId,
          input.body
        ]
      );

      await client.query(
        `update conversations
         set updated_at = now()
         where id = $1 and organization_id = $2`,
        [input.conversationId, input.organizationId]
      );

      return mapMessageRow(result.rows[0]);
    },

    async sendTenantMessage(input: SendTenantMessageRecordInput): Promise<Message | null> {
      const conversationExists = await client.query<ConversationIdRow>(
        `select c.id
         from conversations c
         join tenants t on t.id = c.tenant_id and t.organization_id = c.organization_id
         where c.id = $1
           and c.organization_id = $2
           and t.auth_user_id = $3`,
        [input.conversationId, input.organizationId, input.tenantAuthUserId]
      );

      if (!conversationExists.rows[0]) {
        return null;
      }

      const result = await client.query<MessageRow>(
        `insert into messages (
           id,
           organization_id,
           conversation_id,
           sender_side,
           sender_user_id,
           body
         ) values ($1, $2, $3, 'tenant', null, $4)
         returning id, organization_id, conversation_id, sender_side, sender_user_id, body, created_at`,
        [
          input.messageId,
          input.organizationId,
          input.conversationId,
          input.body
        ]
      );

      await client.query(
        `update conversations
         set updated_at = now()
         where id = $1 and organization_id = $2`,
        [input.conversationId, input.organizationId]
      );

      return mapMessageRow(result.rows[0]);
    },

    async markManagerConversationRead(conversationId: string, organizationId: string): Promise<void> {
      await client.query(
        `update conversations
         set manager_last_read_at = now()
         where id = $1 and organization_id = $2`,
        [conversationId, organizationId]
      );
    }
  };
}

export function createMessageRepositoryFromEnv(env: DatabaseEnvSource): MessageRepository {
  const envResult = readDatabaseEnv(env);
  if (!envResult.success) {
    throw new Error(envResult.error);
  }

  const pool = getOrCreatePool(envResult.data.connectionString);
  return createPostgresMessageRepository(pool);
}
