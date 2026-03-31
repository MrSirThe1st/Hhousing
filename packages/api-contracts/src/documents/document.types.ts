import type { Document, DocumentType, DocumentAttachmentType } from "@hhousing/domain";

export interface CreateDocumentInput {
  organizationId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  documentType: DocumentType;
  attachmentType: DocumentAttachmentType;
  attachmentId: string;
}

export type CreateDocumentOutput = Document;

export interface ListDocumentsFilter {
  organizationId: string;
  attachmentType?: DocumentAttachmentType;
  attachmentId?: string;
  documentType?: DocumentType;
}

export interface ListDocumentsOutput {
  documents: Document[];
}

export interface DeleteDocumentInput {
  documentId: string;
  organizationId: string;
}

export interface DeleteDocumentOutput {
  success: boolean;
}
