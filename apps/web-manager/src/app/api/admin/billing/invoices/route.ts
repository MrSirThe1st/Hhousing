import { createPlatformBillingRepositoryFromEnv } from "@hhousing/data-access";
import type { PlatformSubscriptionInvoiceStatus } from "@hhousing/domain";
import { mapErrorCodeToHttpStatus, requirePlatformAdminSession } from "../../../../../api/shared";
import { extractAuthSessionFromCookies } from "../../../../../auth/session-adapter";
import { jsonResponse } from "../../../shared";

const STATUSES = new Set<PlatformSubscriptionInvoiceStatus>([
  "issued",
  "pending_confirmation",
  "paid",
  "void"
]);

export async function GET(request: Request): Promise<Response> {
  const access = requirePlatformAdminSession(await extractAuthSessionFromCookies());
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status");
  const status =
    statusParam && STATUSES.has(statusParam as PlatformSubscriptionInvoiceStatus)
      ? (statusParam as PlatformSubscriptionInvoiceStatus)
      : null;

  try {
    const repo = createPlatformBillingRepositoryFromEnv(process.env);
    const data = await repo.listInvoices({
      organizationId: url.searchParams.get("organizationId"),
      period: url.searchParams.get("period"),
      status,
      search: url.searchParams.get("search"),
      limit: Number(url.searchParams.get("limit") ?? 50) || 50,
      offset: Number(url.searchParams.get("offset") ?? 0) || 0
    });
    return jsonResponse(200, { success: true, data });
  } catch (error) {
    console.error("Failed to list SaaS invoices", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to list invoices"
    });
  }
}
