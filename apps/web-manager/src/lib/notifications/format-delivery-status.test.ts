import { describe, expect, it } from "vitest";
import { formatInvitationDeliveryMessage, formatLeaseDraftDeliveryMessage, formatDocumentDeliveryMessage } from "./format-delivery-status";

describe("formatInvitationDeliveryMessage", () => {
  it("formats dual-channel success", () => {
    expect(
      formatInvitationDeliveryMessage([
        { channel: "email", status: "sent" },
        { channel: "whatsapp", status: "sent" }
      ])
    ).toBe("Invitation envoyée par email et WhatsApp.");
  });

  it("reports partial WhatsApp failure", () => {
    expect(
      formatInvitationDeliveryMessage([
        { channel: "email", status: "sent" },
        { channel: "whatsapp", status: "failed", error: "WHATSAPP_SEND_FAILED" }
      ])
    ).toBe("Invitation email envoyée. Échec de l'envoi WhatsApp.");
  });
});

describe("formatLeaseDraftDeliveryMessage", () => {
  it("formats dual-channel success", () => {
    expect(
      formatLeaseDraftDeliveryMessage([
        { channel: "email", status: "sent" },
        { channel: "whatsapp", status: "sent" }
      ])
    ).toBe("Brouillon envoyé par email et WhatsApp.");
  });
});

describe("formatDocumentDeliveryMessage", () => {
  it("formats dual-channel success", () => {
    expect(
      formatDocumentDeliveryMessage([
        { channel: "email", status: "sent" },
        { channel: "whatsapp", status: "sent" }
      ])
    ).toBe("Message envoyé par email et WhatsApp.");
  });
});
