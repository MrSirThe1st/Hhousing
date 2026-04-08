import { createPaymentRepo, jsonResponse, parseJsonBody } from "../../../shared";

interface GenerateRecurringChargesRequest {
  organizationId?: string;
  period: string;
}

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
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = `${now.getUTCMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
}

function asOptionalText(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseRequestOptions(request: Request, body: unknown): GenerateRecurringChargesRequest | Response {
  const url = new URL(request.url);
  const bodyRecord = isRecord(body) ? body : null;
  const period = asOptionalText(bodyRecord?.period) ?? asOptionalText(url.searchParams.get("period")) ?? getCurrentUtcPeriod();

  if (!/^\d{4}-(?:0[1-9]|1[0-2])$/.test(period)) {
    return jsonResponse(400, {
      success: false,
      error: "period must be YYYY-MM"
    });
  }

  const organizationId = asOptionalText(bodyRecord?.organizationId) ?? asOptionalText(url.searchParams.get("organizationId"));

  return { period, organizationId };
}

function formatFailure(error: unknown): string {
  if (process.env.NODE_ENV === "production") {
    return "Generation failed";
  }

  return error instanceof Error ? error.message : "Unknown error";
}

async function handle(request: Request): Promise<Response> {
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

  let body: unknown = {};
  if (request.method === "POST") {
    try {
      body = await parseJsonBody(request);
    } catch {
      return jsonResponse(400, {
        success: false,
        error: "Body must be valid JSON"
      });
    }
  }

  const parsed = parseRequestOptions(request, body);
  if (parsed instanceof Response) {
    return parsed;
  }

  const paymentRepository = createPaymentRepo();
  const organizationIds = parsed.organizationId
    ? [parsed.organizationId]
    : await paymentRepository.listOrganizationsWithActiveRecurringCharges();

  const organizations: GenerateRecurringChargesOrganizationResult[] = [];
  const failures: GenerateRecurringChargesFailureResult[] = [];
  let totalGenerated = 0;

  for (const organizationId of organizationIds) {
    try {
      const generated = await paymentRepository.generateMonthlyCharges(organizationId, parsed.period);
      organizations.push({ organizationId, generated });
      totalGenerated += generated;
    } catch (error) {
      failures.push({ organizationId, error: formatFailure(error) });
    }
  }

  const response: GenerateRecurringChargesResponse = {
    period: parsed.period,
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

export async function GET(request: Request): Promise<Response> {
  return handle(request);
}

export async function POST(request: Request): Promise<Response> {
  return handle(request);
}