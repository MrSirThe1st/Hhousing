import { randomUUID } from "crypto";
import { createWhatsAppMessageRepositoryFromEnv } from "@hhousing/data-access";
import { createLoggedWhatsAppSender } from "./logged-sender";
import { createWhatsAppClientFromEnv, isWhatsAppConfigured } from "./meta";
import { getPaymentConfirmationTemplateFromEnv } from "./templates";

export interface SendPaymentConfirmationWhatsAppInput {
  organizationId: string;
  tenantId: string;
  to: string;
  tenantFullName: string;
  amountLabel: string;
  currencyCode: string;
  concerningLabel: string;
  referenceLabel: string;
  createMessageId?: () => string;
}

export type PaymentConfirmationWhatsAppSender = (
  input: SendPaymentConfirmationWhatsAppInput
) => Promise<void>;

export function formatPaymentAmountLabel(amount: number): string {
  return amount.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function buildPaymentConcerningLabel(input: {
  period: string | null;
  invoiceNumber: string;
}): string {
  return input.period?.trim() || `Facture ${input.invoiceNumber}`;
}

export function createPaymentConfirmationWhatsAppSenderFromEnv():
  | PaymentConfirmationWhatsAppSender
  | undefined {
  if (!isWhatsAppConfigured()) {
    return undefined;
  }

  const template = getPaymentConfirmationTemplateFromEnv();
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
            { type: "text", text: input.amountLabel },
            { type: "text", text: input.currencyCode },
            { type: "text", text: input.concerningLabel },
            { type: "text", text: input.referenceLabel }
          ]
        }
      ],
      metadata: {
        scenario: "payment_confirmation"
      }
    });
  };
}
