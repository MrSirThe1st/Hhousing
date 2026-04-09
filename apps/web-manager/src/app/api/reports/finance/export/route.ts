import { Permission } from "@hhousing/api-contracts";
import { requirePermission } from "../../../../../api/organizations/permissions";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../../../../../api/shared";
import { extractAuthSessionFromCookies } from "../../../../../auth/session-adapter";
import {
  buildExpenseDataset,
  buildFinanceReportCsv,
  buildRevenueDataset,
  loadScopedFinanceData,
  normalizeFinanceFilters
} from "../../../../../lib/finance-reporting";
import { createTeamFunctionsRepo, jsonResponse } from "../../../shared";

export async function GET(request: Request): Promise<Response> {
  const access = requireOperatorSession(await extractAuthSessionFromCookies());

  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const permissionResult = await requirePermission(
    access.data,
    Permission.VIEW_PAYMENTS,
    createTeamFunctionsRepo()
  );
  if (!permissionResult.success) {
    return jsonResponse(403, permissionResult);
  }

  const { searchParams } = new URL(request.url);
  const filters = normalizeFinanceFilters({
    propertyId: searchParams.get("propertyId") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined
  });

  const { payments, expenses, scopedPortfolio } = await loadScopedFinanceData(access.data);
  const revenueDataset = buildRevenueDataset(payments, scopedPortfolio, filters);
  const expenseDataset = buildExpenseDataset(expenses, scopedPortfolio, filters);
  const csv = buildFinanceReportCsv(revenueDataset, expenseDataset);

  return new Response(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="finance-report-${filters.from}-to-${filters.to}.csv"`
    }
  });
}