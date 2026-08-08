import { createPlatformBillingRepositoryFromEnv } from "@hhousing/data-access";
import { requireOperatorSession, mapErrorCodeToHttpStatus } from "../../../api/shared";
import { extractAuthSessionFromCookies } from "../../../auth/session-adapter";
import { resolveDashboardAccess } from "../../../lib/dashboard-access";
import { jsonResponse } from "../shared";

export async function GET(): Promise<Response> {
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

  try {
    const repo = createPlatformBillingRepositoryFromEnv(process.env);
    const organizationId = access.data.organizationId;
    const [estimate, invoices, settings, overdue] = await Promise.all([
      repo.estimateOrganizationBilling(organizationId),
      repo.listInvoicesForOrganization(organizationId, 24),
      repo.getBillingSettings(),
      repo.getOpenOverdueInvoiceForOrganization(organizationId)
    ]);

    return jsonResponse(200, {
      success: true,
      data: {
        estimate,
        invoices,
        settings: {
          pricePerUnitAmount: settings.pricePerUnitAmount,
          currencyCode: settings.currencyCode,
          freePropertyThreshold: settings.freePropertyThreshold
        },
        overdueInvoice: overdue,
        billingWritable: dashboardAccess.billingWritable,
        payment: {
          pawapayEnabled:
            process.env.PAWAPAY_SAAS_ENABLED === "1" ||
            process.env.PAWAPAY_SAAS_ENABLED === "true" ||
            process.env.NEXT_PUBLIC_PAWAPAY_SAAS_ENABLED === "1" ||
            process.env.NEXT_PUBLIC_PAWAPAY_SAAS_ENABLED === "true"
        }
      }
    });
  } catch (error) {
    console.error("Failed to load org billing", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to load billing"
    });
  }
}
