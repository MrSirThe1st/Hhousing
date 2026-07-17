import { describe, expect, it, vi } from "vitest";
import {
  processWhatsAppWebhookPayload,
  verifyWhatsAppWebhookRequest
} from "./webhook";

describe("verifyWhatsAppWebhookRequest", () => {
  it("returns the challenge when verification succeeds", () => {
    const result = verifyWhatsAppWebhookRequest({
      mode: "subscribe",
      verifyToken: "secret-token",
      challenge: "1234567890",
      expectedVerifyToken: "secret-token"
    });

    expect(result).toEqual({ success: true, challenge: "1234567890" });
  });

  it("rejects invalid verify tokens", () => {
    const result = verifyWhatsAppWebhookRequest({
      mode: "subscribe",
      verifyToken: "wrong-token",
      challenge: "1234567890",
      expectedVerifyToken: "secret-token"
    });

    expect(result).toEqual({ success: false, reason: "invalid_token" });
  });
});

describe("processWhatsAppWebhookPayload", () => {
  it("updates message delivery status from webhook payload", async () => {
    const getMessageByExternalId = vi.fn().mockResolvedValue({
      id: "msg-1",
      organizationId: "org-1",
      tenantId: "tenant-1",
      templateName: "tenant_invitation_v1",
      phoneNumber: "243812345678",
      status: "sent",
      externalMessageId: "wamid.test123",
      errorMessage: null,
      metadata: null,
      createdAtIso: "2026-01-01T00:00:00.000Z",
      updatedAtIso: "2026-01-01T00:00:00.000Z"
    });
    const updateMessageStatus = vi.fn().mockResolvedValue(null);

    const result = await processWhatsAppWebhookPayload(
      {
        object: "whatsapp_business_account",
        entry: [
          {
            changes: [
              {
                field: "messages",
                value: {
                  messaging_product: "whatsapp",
                  statuses: [
                    {
                      id: "wamid.test123",
                      status: "delivered",
                      recipient_id: "243812345678"
                    }
                  ]
                }
              }
            ]
          }
        ]
      },
      {
        createMessage: vi.fn(),
        getMessageByExternalId,
        updateMessageStatus
      }
    );

    expect(result.processedStatuses).toBe(1);
    expect(updateMessageStatus).toHaveBeenCalledWith({
      id: "msg-1",
      status: "delivered",
      externalMessageId: "wamid.test123",
      errorMessage: null
    });
  });

  it("records template status updates", async () => {
    const result = await processWhatsAppWebhookPayload(
      {
        object: "whatsapp_business_account",
        entry: [
          {
            id: "1581713516772841",
            changes: [
              {
                field: "message_template_status_update",
                value: {
                  event: "APPROVED",
                  message_template_id: 123456,
                  message_template_name: "tenant_invitation_v1",
                  message_template_language: "fr",
                  reason: "NONE"
                }
              }
            ]
          }
        ]
      },
      {
        createMessage: vi.fn(),
        getMessageByExternalId: vi.fn(),
        updateMessageStatus: vi.fn()
      }
    );

    expect(result.processedStatuses).toBe(0);
    expect(result.templateStatusEvents).toEqual([
      {
        event: "APPROVED",
        templateName: "tenant_invitation_v1",
        languageCode: "fr",
        reason: "NONE",
        templateId: "123456",
        wabaId: "1581713516772841"
      }
    ]);
  });
});
