import {
  createPlatformBillingRepositoryFromEnv,
  createTeamFunctionsRepositoryFromEnv
} from "@hhousing/data-access";
import { Permission } from "@hhousing/api-contracts";
import { requireOperatorSession, mapErrorCodeToHttpStatus } from "../../../api/shared";
import { requirePermission } from "../../../api/organizations/permissions";
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
    const [estimate, invoices, paymentMethods, settings, overdue] = await Promise.all([
      repo.estimateOrganizationBilling(organizationId),
      repo.listInvoicesForOrganization(organizationId, 24),
      repo.listPaymentMethods(true),
      repo.getBillingSettings(),
      repo.getOpenOverdueInvoiceForOrganization(organizationId)
    ]);

    return jsonResponse(200, {
      success: true,
      data: {
        estimate,
        invoices,
        paymentMethods,
        settings: {
          pricePerUnitAmount: settings.pricePerUnitAmount,
          currencyCode: settings.currencyCode,
          freePropertyThreshold: settings.freePropertyThreshold
        },
        overdueInvoice: overdue,
        billingWritable: dashboardAccess.billingWritable
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

export async function POST(request: Request): Promise<Response> {
  const access = requireOperatorSession(await extractAuthSessionFromCookies());
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const permission = await requirePermission(
    access.data,
    Permission.MANAGE_ORG_BILLING,
    createTeamFunctionsRepositoryFromEnv(process.env),
    true
  );
  if (!permission.success) {
    // Account owners / ADMIN (*) pass; also allow via dashboard billingWritable for VIEW-only edge
    const dashboardAccess = await resolveDashboardAccess(access.data);
    if (!dashboardAccess.billingWritable) {
      return jsonResponse(mapErrorCodeToHttpStatus(permission.code), permission);
    }
  }

  let body: { invoiceId?: string; paymentNote?: string | null };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: "Invalid JSON body"
    });
  }

  if (!body.invoiceId?.trim()) {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: "invoiceId is required"
    });
  }

  try {
    const repo = createPlatformBillingRepositoryFromEnv(process.env);
    const data = await repo.reportInvoicePayment({
      invoiceId: body.invoiceId.trim(),
      organizationId: access.data.organizationId,
      reportedByUserId: access.data.userId,
      paymentNote: body.paymentNote?.trim() || null
    });

    if (!data) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Invoice not found or already reported"
      });
    }

    return jsonResponse(200, { success: true, data });
  } catch (error) {
    console.error("Failed to report SaaS payment", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to report payment"
    });
  }
}
