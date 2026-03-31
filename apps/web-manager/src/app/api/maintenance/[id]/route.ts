import { updateMaintenanceRequest } from "../../../../api";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../../../../api/shared";
import { extractAuthSessionFromCookies } from "../../../../auth/session-adapter";
import { createMaintenanceRepo, jsonResponse, parseJsonBody } from "../../shared";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const access = requireOperatorSession(await extractAuthSessionFromCookies());

  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const repository = createMaintenanceRepo();

  try {
    const [maintenanceRequest, timeline] = await Promise.all([
      repository.getMaintenanceRequestById(id, access.data.organizationId),
      repository.listMaintenanceRequestTimeline(id, access.data.organizationId)
    ]);

    if (!maintenanceRequest) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Maintenance request not found"
      });
    }

    return jsonResponse(200, {
      success: true,
      data: {
        request: maintenanceRequest,
        timeline
      }
    });
  } catch (error) {
    console.error("Failed to fetch maintenance request", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to fetch maintenance request"
    });
  }
}

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

  const result = await updateMaintenanceRequest(
    {
      requestId: id,
      body,
      session: await extractAuthSessionFromCookies()
    },
    { repository: createMaintenanceRepo() }
  );

  return jsonResponse(result.status, result.body);
}
