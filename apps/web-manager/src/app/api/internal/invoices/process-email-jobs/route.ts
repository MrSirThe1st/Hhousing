import { sendManagedEmailFromEnv } from "../../../../../lib/email/resend";
import { createInvoiceRepo, createRepositoryFromEnv, jsonResponse } from "../../../shared";

function getBearerToken(headers: Headers): string | null {
  const authorization = headers.get("authorization");
  if (!authorization) {
    return null;
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  return token ? token : null;
}

function formatCurrency(amount: number, currencyCode: string): string {
  return `${amount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currencyCode}`;
}

export async function GET(request: Request): Promise<Response> {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return jsonResponse(500, {
      success: false,
      error: "CRON_SECRET is not configured"
    });
  }

  const providedSecret = getBearerToken(request.headers);
  if (providedSecret !== cronSecret) {
    return jsonResponse(401, {
      success: false,
      error: "Unauthorized"
    });
  }

  const invoiceRepository = createInvoiceRepo();
  const organizationRepositoryResult = createRepositoryFromEnv();

  const claimed = await invoiceRepository.claimProcessableEmailJobs(20);
  const sent: string[] = [];
  const failed: Array<{ jobId: string; error: string }> = [];

  for (const item of claimed) {
    try {
      const organization = organizationRepositoryResult.success
        ? await organizationRepositoryResult.data.getOrganizationById(item.job.organizationId)
        : null;

      const body = [
        `Bonjour ${item.tenantFullName},`,
        "",
        `Votre facture ${item.invoice.invoiceNumber} est disponible.`,
        `Montant total: ${formatCurrency(item.invoice.totalAmount, item.invoice.currencyCode)}`,
        `Montant payé: ${formatCurrency(item.invoice.amountPaid, item.invoice.currencyCode)}`,
        `Reste à payer: ${formatCurrency(Math.max(0, item.invoice.totalAmount - item.invoice.amountPaid), item.invoice.currencyCode)}`,
        `Échéance: ${item.invoice.dueDate}`,
        "",
        "Merci."
      ].join("\n");

      await sendManagedEmailFromEnv({
        to: item.tenantEmail,
        subject: `Facture ${item.invoice.invoiceNumber}`,
        body,
        organization
      });

      await invoiceRepository.markEmailJobSent(item.job.id, item.job.organizationId);
      sent.push(item.job.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await invoiceRepository.markEmailJobFailed(item.job.id, item.job.organizationId, message);
      failed.push({ jobId: item.job.id, error: message });
    }
  }

  return jsonResponse(200, {
    success: true,
    data: {
      claimed: claimed.length,
      sentCount: sent.length,
      failedCount: failed.length,
      sent,
      failed
    }
  });
}
