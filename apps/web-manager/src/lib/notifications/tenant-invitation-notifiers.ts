import type { NotificationChannel } from "@hhousing/api-contracts";
import { createTenantInvitationEmailSenderFromEnv } from "../email/resend";
import { createTenantInvitationWhatsAppSenderFromEnv } from "../whatsapp/tenant-invitation";
import type { CreateTenantInvitationDeps } from "../../api/tenants/tenant-invitations";
import { getDefaultNotificationChannels } from "./channels";

export function createTenantInvitationNotificationDepsFromEnv(): Pick<
  CreateTenantInvitationDeps,
  "sendInvitationEmail" | "sendInvitationWhatsApp" | "notificationChannels"
> {
  const sendInvitationWhatsApp = createTenantInvitationWhatsAppSenderFromEnv();

  return {
    sendInvitationEmail: createTenantInvitationEmailSenderFromEnv(),
    notificationChannels: getDefaultNotificationChannels() as NotificationChannel[],
    ...(sendInvitationWhatsApp ? { sendInvitationWhatsApp } : {})
  };
}
