import { createLease, listLeases } from "../../../api";
import { extractAuthSessionFromRequest } from "../../../auth/session-adapter";
import { createId, createTenantLeaseRepo, jsonResponse, parseJsonBody } from "../shared";

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

  const result = await createLease(
    {
      body,
      session: await extractAuthSessionFromRequest(request)
    },
    {
      repository: createTenantLeaseRepo(),
      createId: () => createId("lease")
    }
  );

  return jsonResponse(result.status, result.body);
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId");

  const result = await listLeases(
    {
      organizationId,
      session: await extractAuthSessionFromRequest(request)
    },
    {
      repository: createTenantLeaseRepo()
    }
  );

  return jsonResponse(result.status, result.body);
}
