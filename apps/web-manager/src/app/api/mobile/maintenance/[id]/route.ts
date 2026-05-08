import { extractTenantSessionFromRequest } from "../../../../../auth/session-adapter";
import { mapErrorCodeToHttpStatus } from "../../../../../api/shared";
import { createMaintenanceRepo, jsonResponse } from "../../../shared";

interface MaintenanceDetailOutput {
  request: {
    id: string;
    organizationId: string;
    unitId: string;
    tenantId: string | null;
    title: string;
    description: string;
    priority: string;
    status: string;
    assignedToName: string | null;
    internalNotes: string | null;
    resolutionNotes: string | null;
    resolvedAt: string | null;
    updatedAtIso: string;
    createdAtIso: string;
  };
  timeline: Array<{
    id: string;
    organizationId: string;
    maintenanceRequestId: string;
    eventType: string;
    statusFrom: string | null;
    statusTo: string | null;
    assignedToName: string | null;
    note: string | null;
    createdAtIso: string;
  }>;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const access = await extractTenantSessionFromRequest(request);

  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const { id } = await context.params;

  if (!id) {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: "Missing maintenance request ID"
    });
  }

  const repository = createMaintenanceRepo();

  try {
    const maintenanceRequest = await repository.getMaintenanceRequestById(
      id,
      access.data.organizationId
    );

    if (!maintenanceRequest) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Maintenance request not found"
      });
    }

    // Verify tenant ownership: fetch all tenant-scoped requests and check if this ID is in there
    const tenantRequests = await repository.listMaintenanceRequestsByTenantAuthUserId(
      access.data.userId,
      access.data.organizationId
    );

    const isOwnRequest = tenantRequests.some((r) => r.id === id);
    if (!isOwnRequest) {
      return jsonResponse(403, {
        success: false,
        code: "FORBIDDEN",
        error: "You do not have access to this maintenance request"
      });
    }

    const timeline = await repository.listMaintenanceRequestTimeline(
      id,
      access.data.organizationId
    );

    const response: MaintenanceDetailOutput = {
      request: maintenanceRequest,
      timeline
    };

    return jsonResponse(200, {
      success: true,
      data: response
    });
  } catch (error) {
    console.error("Failed to fetch maintenance request detail", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to fetch maintenance request detail"
    });
  }
}
