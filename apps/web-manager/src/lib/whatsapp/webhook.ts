import type { WhatsAppMessageStatus } from "@hhousing/domain";
import type { WhatsAppMessageRepository } from "@hhousing/data-access";

type WhatsAppWebhookStatus = {
  id?: string;
  status?: string;
  recipient_id?: string;
  timestamp?: string;
  errors?: Array<{ code?: number; title?: string; message?: string }>;
};

type WhatsAppTemplateStatusUpdate = {
  event?: string;
  message_template_id?: number | string;
  message_template_name?: string;
  message_template_language?: string;
  reason?: string;
  disable_info?: {
    disable_date?: string;
  };
};

type WhatsAppWebhookChange = {
  field?: string;
  value?: {
    messaging_product?: string;
    statuses?: WhatsAppWebhookStatus[];
    messages?: Array<{
      from?: string;
      type?: string;
      text?: { body?: string };
      interactive?: {
        type?: string;
        list_reply?: { id?: string; title?: string };
        button_reply?: { id?: string; title?: string };
      };
    }>;
    event?: string;
    message_template_id?: number | string;
    message_template_name?: string;
    message_template_language?: string;
    reason?: string;
    disable_info?: {
      disable_date?: string;
    };
  };
};

type WhatsAppWebhookPayload = {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: WhatsAppWebhookChange[];
  }>;
};

export type WhatsAppTemplateStatusEvent = {
  event: string;
  templateName: string;
  languageCode: string;
  reason: string | null;
  templateId: string | null;
  wabaId: string | null;
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

function parseTemplateStatusUpdate(
  value: WhatsAppWebhookChange["value"],
  wabaId: string | null
): WhatsAppTemplateStatusEvent | null {
  if (!value?.event || !value.message_template_name) {
    return null;
  }

  return {
    event: value.event,
    templateName: value.message_template_name,
    languageCode: value.message_template_language ?? "fr",
    reason: value.reason ?? null,
    templateId: value.message_template_id !== undefined ? String(value.message_template_id) : null,
    wabaId
  };
}

export function logWhatsAppTemplateStatusEvent(event: WhatsAppTemplateStatusEvent): void {
  console.info("[whatsapp:template-status]", JSON.stringify(event));
}

export async function processWhatsAppWebhookPayload(
  payload: WhatsAppWebhookPayload,
  repository: WhatsAppMessageRepository,
  inboundHandler?: (messages: NonNullable<WhatsAppWebhookChange["value"]>["messages"]) => Promise<number>
): Promise<{
  processedStatuses: number;
  processedInboundMessages: number;
  templateStatusEvents: WhatsAppTemplateStatusEvent[];
}> {
  if (payload.object !== "whatsapp_business_account") {
    return { processedStatuses: 0, processedInboundMessages: 0, templateStatusEvents: [] };
  }

  let processedStatuses = 0;
  let processedInboundMessages = 0;
  const templateStatusEvents: WhatsAppTemplateStatusEvent[] = [];

  for (const entry of payload.entry ?? []) {
    const wabaId = entry.id ?? null;

    for (const change of entry.changes ?? []) {
      if (change.field === "message_template_status_update") {
        const templateEvent = parseTemplateStatusUpdate(change.value, wabaId);
        if (templateEvent) {
          logWhatsAppTemplateStatusEvent(templateEvent);
          templateStatusEvents.push(templateEvent);
        }
        continue;
      }

      if (change.field !== "messages") {
        continue;
      }

      const inboundMessages = change.value?.messages ?? [];
      if (inboundHandler && inboundMessages.length > 0) {
        processedInboundMessages += await inboundHandler(inboundMessages);
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

  return { processedStatuses, processedInboundMessages, templateStatusEvents };
}
