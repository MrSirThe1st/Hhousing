import { getOwnerPortalSession } from "@/lib/server-session";
import { loadOwnerPortfolio } from "@/lib/owner-portfolio";
import { buildOwnerPortfolioView } from "@/lib/owner-portfolio-view";
import { buildOwnerStatementCsv, buildOwnerStatementRows } from "@/lib/owner-reporting";
import { jsonResponse } from "../../shared";

function normalizePeriod(value: string | null): string | null {
  if (value === null) {
    return null;
  }

  const period = value.trim();
  if (/^\d{4}-\d{2}$/.test(period)) {
    return period;
  }

  return null;
}

export async function GET(request: Request): Promise<Response> {
  const session = await getOwnerPortalSession();
  if (session === null) {
    return jsonResponse(401, {
      success: false,
      error: "Session owner introuvable"
    });
  }

  const period = normalizePeriod(new URL(request.url).searchParams.get("period"));
  const view = buildOwnerPortfolioView(await loadOwnerPortfolio(session));
  const rows = buildOwnerStatementRows(view, period);
  const csv = buildOwnerStatementCsv(rows);

  return new Response(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="owner-statement-${period ?? "global"}.csv"`
    }
  });
}
