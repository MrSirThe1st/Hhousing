import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Invoice } from "@hhousing/domain";

const { dispatchDualChannelNotificationMock, sendRawHtmlEmailFromEnvMock } = vi.hoisted(() => ({
  dispatchDualChannelNotificationMock: vi.fn(),
  sendRawHtmlEmailFromEnvMock: vi.fn()
}));

vi.mock("./dispatch", () => ({
  dispatchDualChannelNotification: dispatchDualChannelNotificationMock
}));

vi.mock("../email/resend", () => ({
  sendRawHtmlEmailFromEnv: sendRawHtmlEmailFromEnvMock
}));

vi.mock("../whatsapp/payment-confirmation", () => ({
  createPaymentConfirmationWhatsAppSenderFromEnv: vi.fn(() => undefined),
  formatPaymentAmountLabel: (amount: number) => amount.toFixed(2),
  buildPaymentConcerningLabel: () => "Avril 2026"
}));

import { notifyPaidInvoice } from "./paid-invoice-notification";

const invoice: Invoice = {
  id: "inv-1",
  organizationId: "org-1",
  leaseId: "lease-1",
  tenantId: "tenant-1",
  propertyId: "property-1",
  unitId: "unit-1",
  invoiceYear: 2026,
  invoiceSequence: 12,
  invoiceNumber: "FAC-2026-00012",
  invoiceType: "monthly",
  period: "Avril 2026",
  issueDate: "2026-04-01",
  dueDate: "2026-04-10",
  currencyCode: "CDF",
  totalAmount: 500,
  amountPaid: 500,
  status: "paid",
  paidAt: "2026-04-05",
  emailStatus: "not_sent",
  emailSentCount: 0,
  lastEmailedAtIso: null,
  lastEmailError: null,
  voidReason: null,
  voidedAtIso: null,
  sourcePaymentId: "payment-1",
  createdAtIso: "2026-04-01T00:00:00.000Z"
};

describe("notifyPaidInvoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dispatchDualChannelNotificationMock.mockResolvedValue({
      results: [{ channel: "email", status: "sent" }]
    });
    sendRawHtmlEmailFromEnvMock.mockResolvedValue(undefined);
  });

  it("sends the paid invoice email through the dual-channel dispatcher", async () => {
    const sendPaymentConfirmationWhatsApp = vi.fn().mockResolvedValue(undefined);

    await notifyPaidInvoice(
      {
        organizationId: "org-1",
        paymentId: "payment-1",
        paymentAmount: 500,
        invoice,
        tenant: {
          id: "tenant-1",
          fullName: "Jean Dupont",
          email: "jean@example.com",
          phone: "+243700000000",
          whatsappNumber: null,
          whatsappOptIn: true
        },
        organization: null,
        createMessageId: () => "msg-1"
      },
      {
        sendEmail: sendRawHtmlEmailFromEnvMock,
        sendPaymentConfirmationWhatsApp
      }
    );

    expect(dispatchDualChannelNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sendEmail: expect.any(Function),
        sendWhatsApp: expect.any(Function)
      })
    );

    const dispatchArgs = dispatchDualChannelNotificationMock.mock.calls[0]?.[0] as {
      sendEmail: () => Promise<void>;
    };
    await dispatchArgs.sendEmail();

    expect(sendRawHtmlEmailFromEnvMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "jean@example.com",
        subject: "Facture FAC-2026-00012"
      })
    );
  });
});
