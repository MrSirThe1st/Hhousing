import { notifyPaidInvoice } from "./paid-invoice-notification";
import { sendRawHtmlEmailFromEnv } from "../email/resend";
import { createPaymentConfirmationWhatsAppSenderFromEnv } from "../whatsapp/payment-confirmation";

export function createPaidInvoiceNotificationDepsFromEnv(): {
  notifyPaidInvoice: typeof notifyPaidInvoice;
} {
  const sendPaymentConfirmationWhatsApp = createPaymentConfirmationWhatsAppSenderFromEnv();

  return {
    notifyPaidInvoice: (input) =>
      notifyPaidInvoice(input, {
        sendEmail: sendRawHtmlEmailFromEnv,
        ...(sendPaymentConfirmationWhatsApp
          ? { sendPaymentConfirmationWhatsApp }
          : {})
      })
  };
}
