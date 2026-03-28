import {
  createMaintenanceRequest,
  listMaintenanceRequests
} from "../../../api";
import { extractAuthSessionFromRequest } from "../../../auth/session-adapter";
import { createId, createMaintenanceRepo, jsonResponse, parseJsonBody } from "../shared";

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

  const result = await createMaintenanceRequest(
    {
      body,
      session: await extractAuthSessionFromRequest(request)
    },
    {
      repository: createMaintenanceRepo(),
      createId: () => createId("mnt")
    }
  );

  return jsonResponse(result.status, result.body);
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);

  const result = await listMaintenanceRequests(
    {
      organizationId: searchParams.get("organizationId"),
      unitId: searchParams.get("unitId"),
      status: searchParams.get("status"),
      session: await extractAuthSessionFromRequest(request)
    },
    { repository: createMaintenanceRepo() }
  );

  return jsonResponse(result.status, result.body);
}
