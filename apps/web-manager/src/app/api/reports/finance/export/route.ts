import { Permission } from "@hhousing/api-contracts";
import { requirePermission } from "../../../../../api/organizations/permissions";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../../../../../api/shared";
import { extractAuthSessionFromCookies } from "../../../../../auth/session-adapter";
import { rejectIfIndividualExperience } from "../../../../../lib/entreprise-experience-guard";
import { rejectIfV1FeatureDeferred } from "../../../../../lib/v1-deferred-feature-guard";
import { buildFinanceReportCsv } from "../../../../../lib/finance-reporting";
import { loadFinanceExportDatasets } from "../../../../../lib/finance-export-data";
import { createTeamFunctionsRepo, jsonResponse } from "../../../shared";

export async function GET(request: Request): Promise<Response> {
  const access = requireOperatorSession(await extractAuthSessionFromCookies());

  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const experienceDenied = await rejectIfIndividualExperience(access.data);
  if (experienceDenied !== null) {
    return experienceDenied;
  }

  const deferred = rejectIfV1FeatureDeferred("reports");
  if (deferred !== null) {
    return jsonResponse(403, deferred);
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
  const { filters, revenueDataset, expenseDataset } = await loadFinanceExportDatasets(access.data, {
    propertyId: searchParams.get("propertyId") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined
  });
  const csv = buildFinanceReportCsv(revenueDataset, expenseDataset);

  return new Response(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="finance-report-${filters.from}-to-${filters.to}.csv"`
    }
  });
}
