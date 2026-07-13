import type { NotificationChannelDeliveryStatus } from "@hhousing/api-contracts";
import type {
  InvoiceRepository,
  OrganizationPropertyUnitRepository,
  TenantLeaseRepository
} from "@hhousing/data-access";
import type { Invoice, Organization } from "@hhousing/domain";
import { randomUUID } from "crypto";
import type { ManagedEmailAttachmentInput } from "../email/resend";
import { sendRawHtmlEmailFromEnv } from "../email/resend";
import {
  buildInvoiceDocumentContext,
  buildInvoiceDocumentHtml,
  buildInvoiceEmailHtml
} from "../invoices/invoice-document";
import { dispatchDualChannelNotification } from "./dispatch";
import { getDefaultNotificationChannels } from "./channels";
import {
  buildPaymentConcerningLabel,
  createPaymentConfirmationWhatsAppSenderFromEnv,
  formatPaymentAmountLabel,
  type PaymentConfirmationWhatsAppSender
} from "../whatsapp/payment-confirmation";
import { resolveTenantWhatsAppRecipient } from "../whatsapp/phone";

function formatCurrency(amount: number, currencyCode: string): string {
  return `${formatPaymentAmountLabel(amount)} ${currencyCode}`;
}

function formatInvoiceDate(value: string): string {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

export interface BuildPaidInvoiceEmailInput {
  invoice: Invoice;
  tenantName: string;
  tenantEmail: string;
  organization: Organization | null | undefined;
}

export function buildPaidInvoiceEmailPayload(input: BuildPaidInvoiceEmailInput): {
  subject: string;
  html: string;
  attachments: ManagedEmailAttachmentInput[];
} {
  const invoiceDocumentHtml = buildInvoiceDocumentHtml(
    buildInvoiceDocumentContext({
      invoice: input.invoice,
      tenantName: input.tenantName,
      tenantEmail: input.tenantEmail,
      organization: input.organization,
      formatDate: formatInvoiceDate
    })
  );

  const attachmentContentBase64 = Buffer.from(invoiceDocumentHtml, "utf-8").toString("base64");

  return {
    subject: `Facture ${input.invoice.invoiceNumber}`,
    html: buildInvoiceEmailHtml({
      tenantName: input.tenantName,
      organization: input.organization,
      invoiceNumber: input.invoice.invoiceNumber,
      amountLabel: formatCurrency(input.invoice.totalAmount, input.invoice.currencyCode),
      remainingLabel: formatCurrency(
        Math.max(0, input.invoice.totalAmount - input.invoice.amountPaid),
        input.invoice.currencyCode
      ),
      dueDateLabel: formatInvoiceDate(input.invoice.dueDate),
      issueDateLabel: formatInvoiceDate(input.invoice.issueDate),
      periodLabel: input.invoice.period ?? "Facture ponctuelle",
      currencyCode: input.invoice.currencyCode
    }),
    attachments: [
      {
        fileName: `facture-${input.invoice.invoiceNumber}.html`,
        mimeType: "text/html",
        fileUrl: `data:text/html;base64,${attachmentContentBase64}`
      }
    ]
  };
}

export interface NotifyPaidInvoiceInput {
  organizationId: string;
  paymentId: string;
  paymentAmount: number;
  invoice: Invoice;
  tenant: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    whatsappNumber: string | null;
    whatsappOptIn: boolean;
  };
  organization: Organization | null | undefined;
  createMessageId: () => string;
}

export interface NotifyPaidInvoiceDeps {
  sendEmail?: typeof sendRawHtmlEmailFromEnv;
  sendPaymentConfirmationWhatsApp?: PaymentConfirmationWhatsAppSender;
}

export async function notifyPaidInvoice(
  input: NotifyPaidInvoiceInput,
  deps: NotifyPaidInvoiceDeps = {}
): Promise<NotificationChannelDeliveryStatus[]> {
  const sendEmail = deps.sendEmail ?? sendRawHtmlEmailFromEnv;
  const sendPaymentConfirmationWhatsApp =
    deps.sendPaymentConfirmationWhatsApp ?? createPaymentConfirmationWhatsAppSenderFromEnv();
  const emailPayload = buildPaidInvoiceEmailPayload({
    invoice: input.invoice,
    tenantName: input.tenant.fullName,
    tenantEmail: input.tenant.email,
    organization: input.organization
  });
  const whatsappRecipient = resolveTenantWhatsAppRecipient({
    phone: input.tenant.phone,
    whatsappNumber: input.tenant.whatsappNumber,
    whatsappOptIn: input.tenant.whatsappOptIn
  });
  const canSendWhatsApp = Boolean(sendPaymentConfirmationWhatsApp) && Boolean(whatsappRecipient);

  const dispatchResult = await dispatchDualChannelNotification({
    channels: getDefaultNotificationChannels(),
    sendEmail: () =>
      sendEmail({
        to: input.tenant.email,
        subject: emailPayload.subject,
        html: emailPayload.html,
        attachments: emailPayload.attachments
      }),
    sendWhatsApp:
      canSendWhatsApp && sendPaymentConfirmationWhatsApp && whatsappRecipient
        ? () =>
            sendPaymentConfirmationWhatsApp({
              organizationId: input.organizationId,
              tenantId: input.tenant.id,
              to: whatsappRecipient,
              tenantFullName: input.tenant.fullName,
              amountLabel: formatPaymentAmountLabel(input.paymentAmount),
              currencyCode: input.invoice.currencyCode,
              concerningLabel: buildPaymentConcerningLabel({
                period: input.invoice.period,
                invoiceNumber: input.invoice.invoiceNumber
              }),
              referenceLabel: input.invoice.invoiceNumber,
              createMessageId: input.createMessageId
            })
        : undefined
  });

  const emailDelivery = dispatchResult.results.find((notification) => notification.channel === "email");
  if (emailDelivery?.status === "failed") {
    throw new Error(emailDelivery.error ?? "EMAIL_SEND_FAILED");
  }

  return dispatchResult.results;
}

export function shouldSendPaidInvoiceNotification(invoice: Invoice): boolean {
  return invoice.status === "paid" && (invoice.emailStatus === "not_sent" || invoice.emailStatus === "failed");
}

export async function tryNotifyPaidInvoice(params: {
  invoice: Invoice;
  paymentId: string;
  paymentAmount: number;
  organizationId: string;
  tenantId: string;
  invoiceRepository: InvoiceRepository;
  tenantRepository: TenantLeaseRepository;
  organizationRepository?: OrganizationPropertyUnitRepository;
  notifyPaidInvoice?: (
    input: NotifyPaidInvoiceInput,
    deps?: NotifyPaidInvoiceDeps
  ) => ReturnType<typeof notifyPaidInvoice>;
  createMessageId?: () => string;
}): Promise<void> {
  if (!params.notifyPaidInvoice || !shouldSendPaidInvoiceNotification(params.invoice)) {
    return;
  }

  const tenant = await params.tenantRepository.getTenantById(params.tenantId, params.organizationId);
  if (!tenant?.email) {
    return;
  }

  const organization = params.organizationRepository
    ? await params.organizationRepository.getOrganizationById(params.organizationId)
    : null;

  try {
    await params.notifyPaidInvoice({
      organizationId: params.organizationId,
      paymentId: params.paymentId,
      paymentAmount: params.paymentAmount,
      invoice: params.invoice,
      tenant: {
        id: tenant.id,
        fullName: tenant.fullName,
        email: tenant.email,
        phone: tenant.phone,
        whatsappNumber: tenant.whatsappNumber,
        whatsappOptIn: tenant.whatsappOptIn
      },
      organization,
      createMessageId: params.createMessageId ?? (() => randomUUID())
    });
    await params.invoiceRepository.markInvoiceEmailSent(params.invoice.id, params.organizationId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await params.invoiceRepository.markInvoiceEmailFailed(params.invoice.id, params.organizationId, message);
  }
}
