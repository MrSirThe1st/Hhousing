import type { NotificationChannel } from "./channels";
import { getDefaultNotificationChannels } from "./channels";

export type ChannelDeliveryResult = {
  channel: NotificationChannel;
  status: "sent" | "skipped" | "failed";
  error?: string;
};

export type DispatchResult = {
  results: ChannelDeliveryResult[];
};

type ChannelHandler = () => Promise<void>;

export async function dispatchNotification(input: {
  channels?: NotificationChannel[];
  handlers: Partial<Record<NotificationChannel, ChannelHandler>>;
  failSilently?: boolean;
}): Promise<DispatchResult> {
  const channels = input.channels ?? getDefaultNotificationChannels();
  const results: ChannelDeliveryResult[] = [];

  for (const channel of channels) {
    const handler = input.handlers[channel];
    if (!handler) {
      results.push({ channel, status: "skipped" });
      continue;
    }

    try {
      await handler();
      results.push({ channel, status: "sent" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "NOTIFICATION_SEND_FAILED";
      results.push({ channel, status: "failed", error: message });
      if (!input.failSilently) {
        throw error;
      }
    }
  }

  return { results };
}

export async function dispatchDualChannelNotification(input: {
  channels?: NotificationChannel[];
  sendEmail?: () => Promise<void>;
  sendWhatsApp?: () => Promise<void>;
}): Promise<DispatchResult> {
  return dispatchNotification({
    channels: input.channels,
    failSilently: true,
    handlers: {
      email: input.sendEmail,
      whatsapp: input.sendWhatsApp
    }
  });
}
