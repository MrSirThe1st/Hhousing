import { createPlatformBillingRepositoryFromEnv } from "@hhousing/data-access";
import { requireOperatorSession, mapErrorCodeToHttpStatus } from "../../../../../../api/shared";
import { extractAuthSessionFromCookies } from "../../../../../../auth/session-adapter";
import { resolveDashboardAccess } from "../../../../../../lib/dashboard-access";
import {
  billingDisplayStatus,
  billingStatusLabel,
  formatBillingDate,
  formatBillingMoney,
  formatBillingPeriod
} from "../../../../../../lib/billing/saas-billing-ui";
import { buildSaasInvoicePdf } from "../../../../../../lib/billing/saas-invoice-pdf";
import { jsonResponse } from "../../../../shared";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const access = requireOperatorSession(await extractAuthSessionFromCookies());
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const dashboardAccess = await resolveDashboardAccess(access.data);
  if (!dashboardAccess.billing) {
    return jsonResponse(403, {
      success: false,
      code: "FORBIDDEN",
      error: "Missing billing access"
    });
  }

  const { id } = await context.params;

  try {
    const repo = createPlatformBillingRepositoryFromEnv(process.env);
    const invoice = await repo.getInvoiceById(id);
    if (!invoice || invoice.organizationId !== access.data.organizationId) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Facture introuvable"
      });
    }

    const displayStatus = billingDisplayStatus(invoice);
    const pdf = buildSaasInvoicePdf({
      invoiceNumber: invoice.invoiceNumber,
      organizationName: invoice.organizationName,
      periodLabel: formatBillingPeriod(invoice.period),
      propertyCount: invoice.propertyCount,
      unitCount: invoice.unitCount,
      pricePerUnitLabel: formatBillingMoney(invoice.pricePerUnitAmount, invoice.currencyCode),
      amountDueLabel: formatBillingMoney(invoice.amountDue, invoice.currencyCode),
      statusLabel: billingStatusLabel(displayStatus),
      issuedAtLabel: formatBillingDate(invoice.issuedAtIso),
      dueAtLabel: formatBillingDate(invoice.dueAtIso),
      paidAtLabel: invoice.paidAtIso ? formatBillingDate(invoice.paidAtIso) : null,
      currencyCode: invoice.currencyCode
    });

    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.pdf"`,
        "Cache-Control": "private, no-store"
      }
    });
  } catch (error) {
    console.error("Failed to generate SaaS invoice PDF", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Impossible de générer le PDF"
    });
  }
}
