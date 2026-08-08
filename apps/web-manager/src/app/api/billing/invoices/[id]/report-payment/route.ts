import { createPlatformBillingRepositoryFromEnv } from "@hhousing/data-access";
import type { PlatformSaasPaymentMethod } from "@hhousing/domain";
import { requireOperatorSession, mapErrorCodeToHttpStatus } from "../../../../../../api/shared";
import { extractAuthSessionFromCookies } from "../../../../../../auth/session-adapter";
import { resolveDashboardAccess } from "../../../../../../lib/dashboard-access";
import { jsonResponse } from "../../../../shared";

const METHODS = new Set<PlatformSaasPaymentMethod>(["orange", "airtel", "mpesa", "other"]);

export async function POST(
  request: Request,
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
  let body: { paymentMethod?: string | null; paymentNote?: string | null };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const paymentMethod =
    body.paymentMethod && METHODS.has(body.paymentMethod as PlatformSaasPaymentMethod)
      ? (body.paymentMethod as PlatformSaasPaymentMethod)
      : null;

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
    if (invoice.status !== "issued") {
      return jsonResponse(400, {
        success: false,
        code: "VALIDATION_ERROR",
        error: "Cette facture ne peut plus être signalée"
      });
    }

    const data = await repo.reportInvoicePayment({
      invoiceId: id,
      reportedByUserId: access.data.userId,
      paymentMethod,
      paymentNote: body.paymentNote?.trim() || null
    });

    if (!data) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Facture introuvable"
      });
    }

    return jsonResponse(200, { success: true, data });
  } catch (error) {
    console.error("Failed to report SaaS invoice payment", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Impossible d'enregistrer le signalement"
    });
  }
}
