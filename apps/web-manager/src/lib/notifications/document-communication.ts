import type { NotificationChannelDeliveryStatus } from "@hhousing/api-contracts";
import type { ManagedEmailAttachmentInput } from "../email/resend";
import { sendManagedEmailFromEnv } from "../email/resend";
import { dispatchDualChannelNotification } from "./dispatch";
import { getDefaultNotificationChannels } from "./channels";
import { createLeaseDocumentsWhatsAppSenderFromEnv } from "../whatsapp/lease-documents";
import { resolveTenantWhatsAppRecipient } from "../whatsapp/phone";
import type { Organization } from "@hhousing/domain";

export interface SendDocumentCommunicationInput {
  organizationId: string;
  tenantId: string | null;
  tenantEmail: string;
  tenantPhone: string | null;
  tenantWhatsappNumber: string | null;
  tenantWhatsappOptIn: boolean;
  tenantFullName: string;
  organizationName: string;
  propertyLabel: string;
  documentsLink: string;
  emailSubject: string;
  emailBody: string;
  organization: Organization | null;
  attachments: ManagedEmailAttachmentInput[];
  createMessageId: () => string;
}

export async function sendDocumentCommunication(
  input: SendDocumentCommunicationInput
): Promise<NotificationChannelDeliveryStatus[]> {
  const sendLeaseDocumentsWhatsApp = createLeaseDocumentsWhatsAppSenderFromEnv();
  const whatsappRecipient = resolveTenantWhatsAppRecipient({
    phone: input.tenantPhone,
    whatsappNumber: input.tenantWhatsappNumber,
    whatsappOptIn: input.tenantWhatsappOptIn
  });
  const canSendWhatsApp =
    Boolean(input.tenantId)
    && Boolean(sendLeaseDocumentsWhatsApp)
    && Boolean(whatsappRecipient)
    && input.documentsLink.trim().length > 0;

  const dispatchResult = await dispatchDualChannelNotification({
    channels: getDefaultNotificationChannels(),
    sendEmail: () =>
      sendManagedEmailFromEnv({
        to: input.tenantEmail,
        subject: input.emailSubject,
        body: input.emailBody,
        organization: input.organization,
        attachments: input.attachments
      }),
    sendWhatsApp:
      canSendWhatsApp && input.tenantId && sendLeaseDocumentsWhatsApp && whatsappRecipient
        ? () =>
            sendLeaseDocumentsWhatsApp({
              organizationId: input.organizationId,
              tenantId: input.tenantId as string,
              to: whatsappRecipient,
              tenantFullName: input.tenantFullName,
              propertyLabel: input.propertyLabel,
              documentsLink: input.documentsLink,
              organizationName: input.organizationName,
              createMessageId: input.createMessageId
            })
        : undefined
  });

  return dispatchResult.results;
}

/** @deprecated Use sendDocumentCommunication */
export const sendLeaseDraftCommunication = sendDocumentCommunication;

/** @deprecated Use SendDocumentCommunicationInput */
export type SendLeaseDraftCommunicationInput = SendDocumentCommunicationInput;
