import { createPayment, listPayments } from "../../../api";
import { extractAuthSessionFromRequest } from "../../../auth/session-adapter";
import { createId, createPaymentRepo, jsonResponse, parseJsonBody } from "../shared";

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await parseJsonBody(request);
  } catch {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: "Body must be valid JSON"
    });
  }

  const result = await createPayment(
    {
      body,
      session: await extractAuthSessionFromRequest(request)
    },
    {
      repository: createPaymentRepo(),
      createId: () => createId("pay")
    }
  );

  return jsonResponse(result.status, result.body);
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);

  const result = await listPayments(
    {
      organizationId: searchParams.get("organizationId"),
      leaseId: searchParams.get("leaseId"),
      status: searchParams.get("status"),
      session: await extractAuthSessionFromRequest(request)
    },
    { repository: createPaymentRepo() }
  );

  return jsonResponse(result.status, result.body);
}
