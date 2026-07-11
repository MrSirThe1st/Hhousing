import { afterEach, describe, expect, it, vi } from "vitest";
import { createWhatsAppClient } from "./meta";
import { WhatsAppApiError } from "./types";

describe("createWhatsAppClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends a template message and returns the external message id", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ messages: [{ id: "wamid.test123" }] }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = createWhatsAppClient({
      accessToken: "test-token",
      phoneNumberId: "1199569789907328",
      apiVersion: "v25.0"
    });

    const result = await client.sendTemplateMessage({
      to: "27681609849",
      templateName: "jaspers_market_order_confirmation_v1",
      languageCode: "en_US",
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: "John Doe" },
            { type: "text", text: "123456" },
            { type: "text", text: "Jul 11, 2026" }
          ]
        }
      ]
    });

    expect(result.externalMessageId).toBe("wamid.test123");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://graph.facebook.com/v25.0/1199569789907328/messages",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer test-token",
          "Content-Type": "application/json"
        }
      })
    );
  });

  it("throws when the API returns an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("invalid recipient", { status: 400 }))
    );

    const client = createWhatsAppClient({
      accessToken: "test-token",
      phoneNumberId: "1199569789907328",
      apiVersion: "v25.0"
    });

    await expect(
      client.sendTemplateMessage({
        to: "27681609849",
        templateName: "jaspers_market_order_confirmation_v1",
        languageCode: "en_US"
      })
    ).rejects.toBeInstanceOf(WhatsAppApiError);
  });
});
