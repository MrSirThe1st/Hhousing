import { Pool, type QueryResultRow } from "pg";
import type { Document } from "@hhousing/domain";
import type { ListDocumentsFilter } from "@hhousing/api-contracts";
import { readDatabaseEnv, type DatabaseEnvSource } from "../database/database-env";
import type {
  CreateDocumentRecordInput,
  DocumentRepository
} from "./document-record.types";

interface DocumentRow extends QueryResultRow {
  id: string;
  organization_id: string;
  file_name: string;
  file_url: string;
  file_size: number | string;
  mime_type: string;
  document_type: "lease_agreement" | "receipt" | "notice" | "id" | "contract" | "other";
  attachment_type: "property" | "unit" | "tenant" | "lease" | "owner" | null;
  attachment_id: string | null;
  uploaded_by: string;
  created_at: Date | string;
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function toNumber(value: string | number): number {
  return typeof value === "number" ? value : Number(value);
}

function mapDocument(row: DocumentRow): Document {
  return {
    id: row.id,
    organizationId: row.organization_id,
    fileName: row.file_name,
    fileUrl: row.file_url,
    fileSize: toNumber(row.file_size),
    mimeType: row.mime_type,
    documentType: row.document_type,
    attachmentType: row.attachment_type,
    attachmentId: row.attachment_id,
    uploadedBy: row.uploaded_by,
    createdAtIso: toIso(row.created_at)
  };
}

export interface DocumentQueryable {
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

export function createPostgresDocumentRepository(
  client: DocumentQueryable
): DocumentRepository {
  return {
    async createDocument(input: CreateDocumentRecordInput): Promise<Document> {
      const result = await client.query<DocumentRow>(
        `insert into documents (
          id, organization_id, file_name, file_url, file_size,
          mime_type, document_type, attachment_type, attachment_id, uploaded_by
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        returning *`,
        [
          input.id,
          input.organizationId,
          input.fileName,
          input.fileUrl,
          input.fileSize,
          input.mimeType,
          input.documentType,
          input.attachmentType ?? null,
          input.attachmentId ?? null,
          input.uploadedBy
        ]
      );
      return mapDocument(result.rows[0]);
    },

    async listDocuments(filter: ListDocumentsFilter): Promise<Document[]> {
      const conditions: string[] = ["organization_id = $1"];
      const values: unknown[] = [filter.organizationId];
      let paramIndex = 2;

      if (filter.attachmentType) {
        conditions.push(`attachment_type = $${paramIndex}`);
        values.push(filter.attachmentType);
        paramIndex++;
      }

      if (filter.attachmentId) {
        conditions.push(`attachment_id = $${paramIndex}`);
        values.push(filter.attachmentId);
        paramIndex++;
      }

      if (filter.documentType) {
        conditions.push(`document_type = $${paramIndex}`);
        values.push(filter.documentType);
        paramIndex++;
      }

      const result = await client.query<DocumentRow>(
        `select * from documents
         where ${conditions.join(" and ")}
         order by created_at desc`,
        values
      );

      return result.rows.map(mapDocument);
    },

    async getDocumentById(documentId: string, organizationId: string): Promise<Document | null> {
      const result = await client.query<DocumentRow>(
        `select * from documents
         where id = $1 and organization_id = $2`,
        [documentId, organizationId]
      );

      return result.rows[0] ? mapDocument(result.rows[0]) : null;
    },

    async deleteDocument(documentId: string, organizationId: string): Promise<void> {
      await client.query(
        `delete from documents
         where id = $1 and organization_id = $2`,
        [documentId, organizationId]
      );
    }
  };
}

export function createDocumentRepositoryFromEnv(env: DatabaseEnvSource): DocumentRepository {
  const envResult = readDatabaseEnv(env);
  if (!envResult.success) {
    throw new Error(envResult.error);
  }
  const pool = getOrCreatePool(envResult.data.connectionString);
  return createPostgresDocumentRepository(pool);
}
