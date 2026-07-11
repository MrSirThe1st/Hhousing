import { describe, expect, it } from "vitest";
import { formatInvitationDeliveryMessage } from "./format-delivery-status";

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
