import type { WhatsAppMessageStatus } from "@hhousing/domain";
import type { WhatsAppMessageRepository } from "@hhousing/data-access";

type WhatsAppWebhookStatus = {
  id?: string;
  status?: string;
  recipient_id?: string;
  timestamp?: string;
  errors?: Array<{ code?: number; title?: string; message?: string }>;
};

type WhatsAppWebhookChange = {
  field?: string;
  value?: {
    messaging_product?: string;
    statuses?: WhatsAppWebhookStatus[];
  };
};

type WhatsAppWebhookPayload = {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: WhatsAppWebhookChange[];
  }>;
};

export type VerifyWhatsAppWebhookResult =
  | { success: true; challenge: string }
  | { success: false; reason: "missing_config" | "invalid_mode" | "invalid_token" };

export function verifyWhatsAppWebhookRequest(input: {
  mode: string | null;
  verifyToken: string | null;
  challenge: string | null;
  expectedVerifyToken: string | undefined;
}): VerifyWhatsAppWebhookResult {
  if (!input.expectedVerifyToken) {
    return { success: false, reason: "missing_config" };
  }

  if (input.mode !== "subscribe") {
    return { success: false, reason: "invalid_mode" };
  }

  if (!input.verifyToken || input.verifyToken !== input.expectedVerifyToken) {
    return { success: false, reason: "invalid_token" };
  }

  if (!input.challenge) {
    return { success: false, reason: "invalid_mode" };
  }

  return { success: true, challenge: input.challenge };
}

function mapDeliveryStatus(status: string | undefined): WhatsAppMessageStatus | null {
  switch (status) {
    case "sent":
      return "sent";
    case "delivered":
      return "delivered";
    case "read":
      return "read";
    case "failed":
      return "failed";
    default:
      return null;
  }
}

function formatStatusError(status: WhatsAppWebhookStatus): string | null {
  const firstError = status.errors?.[0];
  if (!firstError) {
    return null;
  }

  return [firstError.title, firstError.message].filter(Boolean).join(": ") || "WHATSAPP_DELIVERY_FAILED";
}

export async function processWhatsAppWebhookPayload(
  payload: WhatsAppWebhookPayload,
  repository: WhatsAppMessageRepository
): Promise<{ processedStatuses: number }> {
  if (payload.object !== "whatsapp_business_account") {
    return { processedStatuses: 0 };
  }

  let processedStatuses = 0;

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") {
        continue;
      }

      for (const statusUpdate of change.value?.statuses ?? []) {
        const externalMessageId = statusUpdate.id;
        const mappedStatus = mapDeliveryStatus(statusUpdate.status);
        if (!externalMessageId || !mappedStatus) {
          continue;
        }

        const existingMessage = await repository.getMessageByExternalId(externalMessageId);
        if (!existingMessage) {
          continue;
        }

        await repository.updateMessageStatus({
          id: existingMessage.id,
          status: mappedStatus,
          externalMessageId,
          errorMessage: mappedStatus === "failed" ? formatStatusError(statusUpdate) : null
        });

        processedStatuses += 1;
      }
    }
  }

  return { processedStatuses };
}
