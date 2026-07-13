import type { NotificationChannelDeliveryStatus } from "@hhousing/api-contracts";

const CHANNEL_LABELS = {
  email: "email",
  whatsapp: "WhatsApp"
} as const;

interface FormatCommunicationDeliveryMessageOptions {
  sentPrefix?: string;
  partialEmailSentMessage?: string;
  emptySentMessage?: string;
  failedWhatsAppOnlyMessage?: string;
}

export function formatCommunicationDeliveryMessage(
  notifications: NotificationChannelDeliveryStatus[],
  options: FormatCommunicationDeliveryMessageOptions = {}
): string {
  const sentPrefix = options.sentPrefix ?? "Message envoyé";
  const partialEmailSentMessage =
    options.partialEmailSentMessage ?? "Email envoyé. Échec de l'envoi WhatsApp.";
  const emptySentMessage = options.emptySentMessage ?? `${sentPrefix}.`;
  const failedWhatsAppOnlyMessage =
    options.failedWhatsAppOnlyMessage ?? "Échec de l'envoi WhatsApp.";

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
    return partialEmailSentMessage;
  }

  const sentChannels = notifications
    .filter((notification) => notification.status === "sent")
    .map((notification) => CHANNEL_LABELS[notification.channel]);

  if (sentChannels.length === 0) {
    if (failedWhatsApp) {
      return failedWhatsAppOnlyMessage;
    }

    return emptySentMessage;
  }

  if (sentChannels.length === 1) {
    return `${sentPrefix} par ${sentChannels[0]}.`;
  }

  return `${sentPrefix} par ${sentChannels.join(" et ")}.`;
}

export function formatInvitationDeliveryMessage(
  notifications: NotificationChannelDeliveryStatus[]
): string {
  return formatCommunicationDeliveryMessage(notifications, {
    sentPrefix: "Invitation envoyée",
    partialEmailSentMessage: "Invitation email envoyée. Échec de l'envoi WhatsApp.",
    emptySentMessage: "Invitation envoyée.",
    failedWhatsAppOnlyMessage: "Échec de l'envoi WhatsApp."
  });
}

export function formatLeaseDraftDeliveryMessage(
  notifications: NotificationChannelDeliveryStatus[]
): string {
  return formatCommunicationDeliveryMessage(notifications, {
    sentPrefix: "Brouillon envoyé",
    partialEmailSentMessage: "Brouillon envoyé par email. Échec de l'envoi WhatsApp.",
    emptySentMessage: "Brouillon envoyé.",
    failedWhatsAppOnlyMessage: "Échec de l'envoi WhatsApp."
  });
}

export function formatDocumentDeliveryMessage(
  notifications: NotificationChannelDeliveryStatus[]
): string {
  return formatCommunicationDeliveryMessage(notifications, {
    sentPrefix: "Message envoyé",
    partialEmailSentMessage: "Message envoyé par email. Échec de l'envoi WhatsApp.",
    emptySentMessage: "Message envoyé.",
    failedWhatsAppOnlyMessage: "Échec de l'envoi WhatsApp."
  });
}
