import { createPaymentRepo, jsonResponse } from "../../../shared";
import { getNow } from "../../../../../lib/time";

interface GenerateRecurringChargesOrganizationResult {
  organizationId: string;
  generated: number;
}

interface GenerateRecurringChargesFailureResult {
  organizationId: string;
  error: string;
}

interface GenerateRecurringChargesResponse {
  period: string;
  processedOrganizations: number;
  totalGenerated: number;
  organizations: GenerateRecurringChargesOrganizationResult[];
  failures: GenerateRecurringChargesFailureResult[];
}

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
  const now = getNow();
  const year = now.getUTCFullYear();
  const month = `${now.getUTCMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
}

function formatFailure(error: unknown): string {
  if (process.env.NODE_ENV === "production") {
    return "Generation failed";
  }

  return error instanceof Error ? error.message : "Unknown error";
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

  const paymentRepository = createPaymentRepo();
  const period = getCurrentUtcPeriod();
  const organizationIds = await paymentRepository.listOrganizationsWithActiveRecurringCharges();

  const organizations: GenerateRecurringChargesOrganizationResult[] = [];
  const failures: GenerateRecurringChargesFailureResult[] = [];
  let totalGenerated = 0;

  for (const organizationId of organizationIds) {
    try {
      const generated = await paymentRepository.generateMonthlyCharges(organizationId, period);
      organizations.push({ organizationId, generated });
      totalGenerated += generated;
    } catch (error) {
      failures.push({ organizationId, error: formatFailure(error) });
    }
  }

  const response: GenerateRecurringChargesResponse = {
    period,
    processedOrganizations: organizations.length,
    totalGenerated,
    organizations,
    failures
  };

  return jsonResponse(200, {
    success: true,
    data: response
  });
}