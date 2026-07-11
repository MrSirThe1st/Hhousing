export type NotificationChannel = "email" | "whatsapp";

const VALID_CHANNELS: NotificationChannel[] = ["email", "whatsapp"];

export function parseNotificationChannels(rawValue: string | undefined): NotificationChannel[] {
  if (!rawValue) {
    return ["email"];
  }

  const channels = rawValue
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is NotificationChannel => VALID_CHANNELS.includes(value as NotificationChannel));

  return channels.length > 0 ? channels : ["email"];
}

export function getDefaultNotificationChannels(): NotificationChannel[] {
  return parseNotificationChannels(process.env.NOTIFICATION_DEFAULT_CHANNELS);
}

export function isWhatsAppChannelEnabled(channels: NotificationChannel[] = getDefaultNotificationChannels()): boolean {
  return channels.includes("whatsapp");
}

export function isEmailChannelEnabled(channels: NotificationChannel[] = getDefaultNotificationChannels()): boolean {
  return channels.includes("email");
}
