import type { Document, DocumentType, DocumentAttachmentType } from "@hhousing/domain";
import type { ListDocumentsFilter } from "@hhousing/api-contracts";

export interface CreateDocumentRecordInput {
  id: string;
  organizationId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  documentType: DocumentType;
  attachmentType: DocumentAttachmentType;
  attachmentId: string;
  uploadedBy: string;
}

export interface DocumentRepository {
  createDocument(input: CreateDocumentRecordInput): Promise<Document>;
  listDocuments(filter: ListDocumentsFilter): Promise<Document[]>;
  getDocumentById(documentId: string, organizationId: string): Promise<Document | null>;
  deleteDocument(documentId: string, organizationId: string): Promise<void>;
}
