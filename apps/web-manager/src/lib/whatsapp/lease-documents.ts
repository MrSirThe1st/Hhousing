import { randomUUID } from "crypto";
import { createWhatsAppMessageRepositoryFromEnv } from "@hhousing/data-access";
import { createLoggedWhatsAppSender } from "./logged-sender";
import { createWhatsAppClientFromEnv, isWhatsAppConfigured } from "./meta";
import { getLeaseDocumentsTemplateFromEnv } from "./templates";

export interface SendLeaseDocumentsWhatsAppInput {
  organizationId: string;
  tenantId: string;
  to: string;
  tenantFullName: string;
  propertyLabel: string;
  documentsLink: string;
  organizationName: string;
  createMessageId?: () => string;
}

export type LeaseDocumentsWhatsAppSender = (
  input: SendLeaseDocumentsWhatsAppInput
) => Promise<void>;

export function createLeaseDocumentsWhatsAppSenderFromEnv():
  | LeaseDocumentsWhatsAppSender
  | undefined {
  if (!isWhatsAppConfigured()) {
    return undefined;
  }

  const template = getLeaseDocumentsTemplateFromEnv();
  if (!template) {
    return undefined;
  }

  const client = createWhatsAppClientFromEnv();
  const repository = createWhatsAppMessageRepositoryFromEnv();
  const sendLogged = createLoggedWhatsAppSender({
    sendTemplateMessage: (input) => client.sendTemplateMessage(input),
    repository
  });

  return async (input) => {
    await sendLogged({
      organizationId: input.organizationId,
      tenantId: input.tenantId,
      createMessageId: input.createMessageId ?? (() => randomUUID()),
      to: input.to,
      templateName: template.name,
      languageCode: template.languageCode,
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: input.tenantFullName },
            { type: "text", text: input.propertyLabel },
            { type: "text", text: input.documentsLink },
            { type: "text", text: input.organizationName }
          ]
        }
      ],
      metadata: {
        scenario: "lease_documents"
      }
    });
  };
}

export function buildLeasePropertyLabel(input: {
  propertyName: string | null | undefined;
  unitNumber: string | null | undefined;
}): string {
  const propertyName = input.propertyName?.trim() || "Votre logement";
  const unitNumber = input.unitNumber?.trim();
  return unitNumber ? `${propertyName} - unité ${unitNumber}` : propertyName;
}

export function resolveLeaseDocumentsLink(documents: Array<{ fileUrl: string }>): string | null {
  const firstDocumentUrl = documents.find((document) => document.fileUrl.trim().length > 0)?.fileUrl.trim();
  return firstDocumentUrl ?? null;
}
