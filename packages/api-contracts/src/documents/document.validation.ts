import { z } from "zod";

export const documentTypeSchema = z.enum(["lease_agreement", "receipt", "notice", "id", "contract", "other"]);

export const documentAttachmentTypeSchema = z.enum(["property", "unit", "tenant", "lease", "owner"]);

export const createDocumentInputSchema = z.object({
  organizationId: z.string().min(1),
  fileName: z.string().min(1),
  fileUrl: z.string().url(),
  fileSize: z.number().int().positive(),
  mimeType: z.string().min(1),
  documentType: documentTypeSchema,
  attachmentType: documentAttachmentTypeSchema.optional(),
  attachmentId: z.string().min(1).optional()
}).superRefine((value, context) => {
  const hasAttachmentType = value.attachmentType !== undefined;
  const hasAttachmentId = value.attachmentId !== undefined;

  if (hasAttachmentType !== hasAttachmentId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "attachmentType and attachmentId must be provided together"
    });
  }
});

export const listDocumentsFilterSchema = z.object({
  organizationId: z.string().min(1),
  attachmentType: documentAttachmentTypeSchema.optional(),
  attachmentId: z.string().min(1).optional(),
  documentType: documentTypeSchema.optional()
});

export const deleteDocumentInputSchema = z.object({
  documentId: z.string().min(1),
  organizationId: z.string().min(1)
});
