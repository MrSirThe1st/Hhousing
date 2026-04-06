import { createTenant, listTenants } from "../../../api";
import { extractAuthSessionFromCookies } from "../../../auth/session-adapter";
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

  const result = await createTenant(
    {
      body,
      session: await extractAuthSessionFromCookies()
    },
    {
      repository: createTenantLeaseRepo(),
      createId: () => createId("ten")
    }
  );

  return jsonResponse(result.status, result.body);
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const session = await extractAuthSessionFromCookies();

  const result = await listTenants(
    {
      organizationId: searchParams.get("organizationId"),
      session
    },
    { repository: createTenantLeaseRepo() }
  );

  return jsonResponse(result.status, result.body);
}
