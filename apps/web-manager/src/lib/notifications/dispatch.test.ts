import { describe, expect, it, vi } from "vitest";
import { dispatchDualChannelNotification } from "./dispatch";

describe("dispatchDualChannelNotification", () => {
  it("sends to both channels and tolerates WhatsApp failures", async () => {
    const sendEmail = vi.fn().mockResolvedValue(undefined);
    const sendWhatsApp = vi.fn().mockRejectedValue(new Error("WHATSAPP_SEND_FAILED"));

    const result = await dispatchDualChannelNotification({
      channels: ["email", "whatsapp"],
      sendEmail,
      sendWhatsApp
    });

    expect(sendEmail).toHaveBeenCalledOnce();
    expect(sendWhatsApp).toHaveBeenCalledOnce();
    expect(result.results).toEqual([
      { channel: "email", status: "sent" },
      { channel: "whatsapp", status: "failed", error: "WHATSAPP_SEND_FAILED" }
    ]);
  });

  it("skips handlers that are not provided", async () => {
    const sendEmail = vi.fn().mockResolvedValue(undefined);

    const result = await dispatchDualChannelNotification({
      channels: ["email", "whatsapp"],
      sendEmail
    });

    expect(result.results).toEqual([
      { channel: "email", status: "sent" },
      { channel: "whatsapp", status: "skipped" }
    ]);
  });
});
