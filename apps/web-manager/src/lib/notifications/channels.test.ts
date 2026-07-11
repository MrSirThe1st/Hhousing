import { describe, expect, it } from "vitest";
import {
  getDefaultNotificationChannels,
  isEmailChannelEnabled,
  isWhatsAppChannelEnabled,
  parseNotificationChannels
} from "./channels";

describe("parseNotificationChannels", () => {
  it("defaults to email when unset", () => {
    expect(parseNotificationChannels(undefined)).toEqual(["email"]);
  });

  it("parses comma-separated channels", () => {
    expect(parseNotificationChannels("email, whatsapp")).toEqual(["email", "whatsapp"]);
  });

  it("ignores unknown channels", () => {
    expect(parseNotificationChannels("email,sms")).toEqual(["email"]);
  });
});

describe("channel helpers", () => {
  it("detects enabled channels", () => {
    expect(isEmailChannelEnabled(["email", "whatsapp"])).toBe(true);
    expect(isWhatsAppChannelEnabled(["email", "whatsapp"])).toBe(true);
    expect(isWhatsAppChannelEnabled(["email"])).toBe(false);
  });

  it("reads default channels from env", () => {
    process.env.NOTIFICATION_DEFAULT_CHANNELS = "email,whatsapp";
    expect(getDefaultNotificationChannels()).toEqual(["email", "whatsapp"]);
    delete process.env.NOTIFICATION_DEFAULT_CHANNELS;
  });
});
