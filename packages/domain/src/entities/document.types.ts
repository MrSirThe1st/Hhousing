export type DocumentType = "lease_agreement" | "receipt" | "notice" | "id" | "contract" | "other";

export type DocumentAttachmentType = "property" | "unit" | "tenant" | "lease";

export interface Document {
  id: string;
  organizationId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number; // bytes
  mimeType: string;
  documentType: DocumentType;
  attachmentType: DocumentAttachmentType | null;
  attachmentId: string | null; // property/unit/tenant/lease id
  uploadedBy: string; // user id
  createdAtIso: string;
}
