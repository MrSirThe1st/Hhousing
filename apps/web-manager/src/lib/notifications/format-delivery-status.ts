import type { NotificationChannelDeliveryStatus } from "@hhousing/api-contracts";

const CHANNEL_LABELS = {
  email: "email",
  whatsapp: "WhatsApp"
} as const;

export function formatInvitationDeliveryMessage(
  notifications: NotificationChannelDeliveryStatus[]
): string {
  const sentEmail = notifications.find(
    (notification) => notification.channel === "email" && notification.status === "sent"
  );
  const sentWhatsApp = notifications.find(
    (notification) => notification.channel === "whatsapp" && notification.status === "sent"
  );
  const failedWhatsApp = notifications.find(
    (notification) => notification.channel === "whatsapp" && notification.status === "failed"
  );

  if (sentEmail && failedWhatsApp && !sentWhatsApp) {
    return "Invitation email envoyée. Échec de l'envoi WhatsApp.";
  }

  const sentChannels = notifications
    .filter((notification) => notification.status === "sent")
    .map((notification) => CHANNEL_LABELS[notification.channel]);

  if (sentChannels.length === 0) {
    if (failedWhatsApp) {
      return "Échec de l'envoi WhatsApp.";
    }

    return "Invitation envoyée.";
  }

  if (sentChannels.length === 1) {
    return `Invitation envoyée par ${sentChannels[0]}.`;
  }

  return `Invitation envoyée par ${sentChannels.join(" et ")}.`;
}
