import { beforeEach, describe, expect, it, vi } from "vitest";

const { processWhatsAppWebhookPayloadMock } = vi.hoisted(() => ({
  processWhatsAppWebhookPayloadMock: vi.fn()
}));

vi.mock("../../../../lib/whatsapp/webhook", () => ({
  verifyWhatsAppWebhookRequest: vi.fn((input: {
    mode: string | null;
    verifyToken: string | null;
    challenge: string | null;
    expectedVerifyToken: string | undefined;
  }) => {
    if (!input.expectedVerifyToken) {
      return { success: false, reason: "missing_config" };
    }
    if (input.mode !== "subscribe" || input.verifyToken !== input.expectedVerifyToken || !input.challenge) {
      return { success: false, reason: "invalid_token" };
    }
    return { success: true, challenge: input.challenge };
  }),
  processWhatsAppWebhookPayload: processWhatsAppWebhookPayloadMock
}));

import { GET } from "./route";

describe("/api/webhooks/whatsapp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = "test-verify-token";
  });

  it("returns the hub challenge during Meta verification", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=test-verify-token&hub.challenge=1234567890"
      )
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("1234567890");
  });

  it("rejects invalid verify tokens", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=1234567890"
      )
    );

    expect(response.status).toBe(403);
  });
});
