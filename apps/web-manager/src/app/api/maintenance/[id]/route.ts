import { updateMaintenanceStatus } from "../../../../api";
import { extractAuthSessionFromCookies } from "../../../../auth/session-adapter";
import { createMaintenanceRepo, jsonResponse, parseJsonBody } from "../../shared";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;

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

  const result = await updateMaintenanceStatus(
    {
      requestId: id,
      body,
      session: await extractAuthSessionFromCookies()
    },
    { repository: createMaintenanceRepo() }
  );

  return jsonResponse(result.status, result.body);
}
