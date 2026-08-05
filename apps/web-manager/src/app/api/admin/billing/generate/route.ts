import { createPlatformAdminRepositoryFromEnv, createPlatformBillingRepositoryFromEnv } from "@hhousing/data-access";
import { mapErrorCodeToHttpStatus, requirePlatformAdminSession } from "../../../../../api/shared";
import { extractAuthSessionFromCookies } from "../../../../../auth/session-adapter";
import { jsonResponse } from "../../../shared";
import { randomUUID } from "crypto";

function getCurrentUtcPeriod(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = `${now.getUTCMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
}

function defaultDueAtIso(period: string): string {
  const [yearStr, monthStr] = period.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  // Due on the 10th of the following month (UTC)
  const due = new Date(Date.UTC(year, month, 10, 23, 59, 59));
  return due.toISOString();
}

export async function POST(request: Request): Promise<Response> {
  const access = requirePlatformAdminSession(await extractAuthSessionFromCookies());
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  let body: { period?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const period = body.period?.trim() || getCurrentUtcPeriod();
  if (!/^\d{4}-\d{2}$/.test(period)) {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: "period must be YYYY-MM"
    });
  }

  try {
    const billingRepo = createPlatformBillingRepositoryFromEnv(process.env);
    const adminRepo = createPlatformAdminRepositoryFromEnv(process.env);
    const dueAtIso = defaultDueAtIso(period);
    const data = await billingRepo.generateInvoicesForPeriod(period, dueAtIso);

    await adminRepo.createPlatformAuditLog({
      id: randomUUID(),
      actorUserId: access.data.userId,
      actionKey: "billing.invoices.generate",
      entityType: "saas_invoice_batch",
      entityId: period,
      metadata: {
        created: data.created,
        skippedFree: data.skippedFree,
        skippedExisting: data.skippedExisting,
        failureCount: data.failures.length
      }
    });

    return jsonResponse(200, { success: true, data });
  } catch (error) {
    console.error("Failed to generate SaaS invoices", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to generate invoices"
    });
  }
}
