import { createPlatformBillingRepositoryFromEnv } from "@hhousing/data-access";
import { jsonResponse } from "../../../shared";

function getBearerToken(headers: Headers): string | null {
  const authorization = headers.get("authorization");
  if (!authorization) {
    return null;
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  return token ? token : null;
}

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
  const due = new Date(Date.UTC(year, month, 10, 23, 59, 59));
  return due.toISOString();
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

  const url = new URL(request.url);
  const period = url.searchParams.get("period")?.trim() || getCurrentUtcPeriod();
  if (!/^\d{4}-\d{2}$/.test(period)) {
    return jsonResponse(400, {
      success: false,
      error: "period must be YYYY-MM"
    });
  }

  try {
    const repo = createPlatformBillingRepositoryFromEnv(process.env);
    const data = await repo.generateInvoicesForPeriod(period, defaultDueAtIso(period));
    return jsonResponse(200, { success: true, data });
  } catch (error) {
    console.error("Failed to generate SaaS invoices via cron", error);
    return jsonResponse(500, {
      success: false,
      error: process.env.NODE_ENV === "production" ? "Generation failed" : String(error)
    });
  }
}
