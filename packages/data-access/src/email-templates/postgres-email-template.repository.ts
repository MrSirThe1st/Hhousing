import { Pool, type QueryResultRow } from "pg";
import type { EmailTemplate } from "@hhousing/domain";
import { readDatabaseEnv, type DatabaseEnvSource } from "../database/database-env";
import type {
  CreateEmailTemplateRecordInput,
  EmailTemplateRepository,
  UpdateEmailTemplateRecordInput
} from "./email-template-record.types";

interface EmailTemplateRow extends QueryResultRow {
  id: string;
  organization_id: string;
  name: string;
  scenario: "welcome_letter" | "house_rules" | "lease_draft" | "general";
  subject: string;
  body: string;
  created_by_user_id: string;
  updated_by_user_id: string;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface EmailTemplateQueryable {
  query<Row extends QueryResultRow>(
    text: string,
    values?: readonly unknown[]
  ): Promise<{ rows: Row[]; rowCount?: number | null }>;
}

const poolCache = new Map<string, Pool>();

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function mapEmailTemplate(row: EmailTemplateRow): EmailTemplate {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    scenario: row.scenario,
    subject: row.subject,
    body: row.body,
    createdByUserId: row.created_by_user_id,
    updatedByUserId: row.updated_by_user_id,
    createdAtIso: toIso(row.created_at),
    updatedAtIso: toIso(row.updated_at)
  };
}

function getOrCreatePool(connectionString: string): Pool {
  const existing = poolCache.get(connectionString);
  if (existing) {
    return existing;
  }

  const pool = new Pool({ connectionString, max: 5 });
  poolCache.set(connectionString, pool);
  return pool;
}

export function createPostgresEmailTemplateRepository(client: EmailTemplateQueryable): EmailTemplateRepository {
  return {
    async listEmailTemplates(organizationId: string): Promise<EmailTemplate[]> {
      const result = await client.query<EmailTemplateRow>(
        `select * from email_templates where organization_id = $1 order by created_at desc`,
        [organizationId]
      );
      return result.rows.map(mapEmailTemplate);
    },

    async createEmailTemplate(input: CreateEmailTemplateRecordInput): Promise<EmailTemplate> {
      const result = await client.query<EmailTemplateRow>(
        `insert into email_templates (
           id, organization_id, name, scenario, subject, body, created_by_user_id, updated_by_user_id
         ) values ($1, $2, $3, $4, $5, $6, $7, $8)
         returning *`,
        [
          input.id,
          input.organizationId,
          input.name,
          input.scenario,
          input.subject,
          input.body,
          input.createdByUserId,
          input.updatedByUserId
        ]
      );
      return mapEmailTemplate(result.rows[0]);
    },

    async updateEmailTemplate(input: UpdateEmailTemplateRecordInput): Promise<EmailTemplate | null> {
      const result = await client.query<EmailTemplateRow>(
        `update email_templates
         set name = $1,
             scenario = $2,
             subject = $3,
             body = $4,
             updated_by_user_id = $5,
             updated_at = now()
         where id = $6 and organization_id = $7
         returning *`,
        [input.name, input.scenario, input.subject, input.body, input.updatedByUserId, input.id, input.organizationId]
      );
      return result.rows[0] ? mapEmailTemplate(result.rows[0]) : null;
    },

    async deleteEmailTemplate(id: string, organizationId: string): Promise<void> {
      await client.query(`delete from email_templates where id = $1 and organization_id = $2`, [id, organizationId]);
    },

    async getEmailTemplateById(id: string, organizationId: string): Promise<EmailTemplate | null> {
      const result = await client.query<EmailTemplateRow>(
        `select * from email_templates where id = $1 and organization_id = $2`,
        [id, organizationId]
      );
      return result.rows[0] ? mapEmailTemplate(result.rows[0]) : null;
    }
  };
}

export function createEmailTemplateRepositoryFromEnv(env: DatabaseEnvSource): EmailTemplateRepository {
  const databaseEnv = readDatabaseEnv(env);
  if (!databaseEnv.success) {
    throw new Error(databaseEnv.error);
  }

  const pool = getOrCreatePool(databaseEnv.data.connectionString);
  return createPostgresEmailTemplateRepository(pool);
}