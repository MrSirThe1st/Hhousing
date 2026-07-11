import { Pool, type QueryResultRow } from "pg";
import type { WhatsAppMessage, WhatsAppMessageStatus } from "@hhousing/domain";
import { readDatabaseEnv, type DatabaseEnvSource } from "../database/database-env";
import type {
  CreateWhatsAppMessageRecordInput,
  UpdateWhatsAppMessageStatusInput,
  WhatsAppMessageRepository
} from "./whatsapp-message-record.types";

interface WhatsAppMessageRow extends QueryResultRow {
  id: string;
  organization_id: string;
  tenant_id: string | null;
  template_name: string;
  phone_number: string;
  status: WhatsAppMessageStatus;
  external_message_id: string | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date | string;
  updated_at: Date | string;
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function mapMessage(row: WhatsAppMessageRow): WhatsAppMessage {
  return {
    id: row.id,
    organizationId: row.organization_id,
    tenantId: row.tenant_id,
    templateName: row.template_name,
    phoneNumber: row.phone_number,
    status: row.status,
    externalMessageId: row.external_message_id,
    errorMessage: row.error_message,
    metadata: row.metadata,
    createdAtIso: toIso(row.created_at),
    updatedAtIso: toIso(row.updated_at)
  };
}

export interface WhatsAppMessageQueryable {
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

export function createPostgresWhatsAppMessageRepository(
  client: WhatsAppMessageQueryable
): WhatsAppMessageRepository {
  return {
    async createMessage(input: CreateWhatsAppMessageRecordInput): Promise<WhatsAppMessage> {
      const result = await client.query<WhatsAppMessageRow>(
        `insert into whatsapp_messages (
          id, organization_id, tenant_id, template_name, phone_number, status, metadata
        ) values ($1, $2, $3, $4, $5, 'pending', $6)
        returning id, organization_id, tenant_id, template_name, phone_number, status,
                  external_message_id, error_message, metadata, created_at, updated_at`,
        [
          input.id,
          input.organizationId,
          input.tenantId ?? null,
          input.templateName,
          input.phoneNumber,
          input.metadata ?? null
        ]
      );

      const row = result.rows[0];
      if (!row) {
        throw new Error("WHATSAPP_MESSAGE_CREATE_FAILED");
      }

      return mapMessage(row);
    },

    async updateMessageStatus(input: UpdateWhatsAppMessageStatusInput): Promise<WhatsAppMessage | null> {
      const result = await client.query<WhatsAppMessageRow>(
        `update whatsapp_messages
         set status = $2,
             external_message_id = coalesce($3, external_message_id),
             error_message = $4,
             updated_at = now()
         where id = $1
         returning id, organization_id, tenant_id, template_name, phone_number, status,
                   external_message_id, error_message, metadata, created_at, updated_at`,
        [input.id, input.status, input.externalMessageId ?? null, input.errorMessage ?? null]
      );

      const row = result.rows[0];
      return row ? mapMessage(row) : null;
    },

    async getMessageByExternalId(externalMessageId: string): Promise<WhatsAppMessage | null> {
      const result = await client.query<WhatsAppMessageRow>(
        `select id, organization_id, tenant_id, template_name, phone_number, status,
                external_message_id, error_message, metadata, created_at, updated_at
         from whatsapp_messages
         where external_message_id = $1
         limit 1`,
        [externalMessageId]
      );

      const row = result.rows[0];
      return row ? mapMessage(row) : null;
    }
  };
}

export function createWhatsAppMessageRepositoryFromEnv(
  source: DatabaseEnvSource = process.env
): WhatsAppMessageRepository {
  const envResult = readDatabaseEnv(source);
  if (!envResult.success) {
    throw new Error(envResult.error);
  }
  const pool = getOrCreatePool(envResult.data.connectionString);
  return createPostgresWhatsAppMessageRepository(pool);
}
