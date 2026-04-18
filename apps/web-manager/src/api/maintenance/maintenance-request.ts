import type {
  ApiResult,
  AuthSession,
  CreateMaintenanceRequestOutput,
  UpdateMaintenanceRequestOutput,
  ListMaintenanceRequestsOutput
} from "@hhousing/api-contracts";
import {
  Permission,
  parseCreateMaintenanceRequestInput,
  parseUpdateMaintenanceRequestInput
} from "@hhousing/api-contracts";
import type { MaintenanceRequestRepository } from "@hhousing/data-access";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../shared";
import type { TeamPermissionRepository } from "../organizations/permissions";
import { requirePermission } from "../organizations/permissions";
import { logOperatorAuditEvent } from "../audit-log";

export interface CreateMaintenanceRequestRequest {
  body: unknown;
  session: AuthSession | null;
}

export interface CreateMaintenanceRequestResponse {
  status: number;
  body: ApiResult<CreateMaintenanceRequestOutput>;
}

export interface CreateMaintenanceRequestDeps {
  repository: MaintenanceRequestRepository;
  createId: () => string;
  teamFunctionsRepository: TeamPermissionRepository;
}

export async function createMaintenanceRequest(
  request: CreateMaintenanceRequestRequest,
  deps: CreateMaintenanceRequestDeps
): Promise<CreateMaintenanceRequestResponse> {
  const sessionResult = requireOperatorSession(request.session);
  if (!sessionResult.success) {
    return { status: mapErrorCodeToHttpStatus(sessionResult.code), body: sessionResult };
  }

  const permissionResult = await requirePermission(
    sessionResult.data,
    Permission.MANAGE_MAINTENANCE,
    deps.teamFunctionsRepository,
    true
  );
  if (!permissionResult.success) {
    return { status: 403, body: permissionResult };
  }

  const parsed = parseCreateMaintenanceRequestInput(request.body);
  if (!parsed.success) {
    return { status: mapErrorCodeToHttpStatus(parsed.code), body: parsed };
  }

  if (parsed.data.organizationId !== sessionResult.data.organizationId) {
    return {
      status: 403,
      body: { success: false, code: "FORBIDDEN", error: "Organization mismatch" }
    };
  }

  const req = await deps.repository.createMaintenanceRequest({
    id: deps.createId(),
    organizationId: parsed.data.organizationId,
    unitId: parsed.data.unitId,
    tenantId: parsed.data.tenantId,
    title: parsed.data.title,
    description: parsed.data.description,
    priority: parsed.data.priority
  });

  await logOperatorAuditEvent({
    session: sessionResult.data,
    actionKey: "services.maintenance.created",
    entityType: "maintenance_request",
    entityId: req.id,
    metadata: {
      unitId: req.unitId,
      tenantId: req.tenantId,
      priority: req.priority,
      status: req.status
    }
  });

  return { status: 201, body: { success: true, data: req } };
}

export interface UpdateMaintenanceRequestRequest {
  requestId: string;
  body: unknown;
  session: AuthSession | null;
}

export interface UpdateMaintenanceRequestResponse {
  status: number;
  body: ApiResult<UpdateMaintenanceRequestOutput>;
}

export interface UpdateMaintenanceRequestDeps {
  repository: MaintenanceRequestRepository;
  teamFunctionsRepository: TeamPermissionRepository;
}

export async function updateMaintenanceRequest(
  request: UpdateMaintenanceRequestRequest,
  deps: UpdateMaintenanceRequestDeps
): Promise<UpdateMaintenanceRequestResponse> {
  const sessionResult = requireOperatorSession(request.session);
  if (!sessionResult.success) {
    return { status: mapErrorCodeToHttpStatus(sessionResult.code), body: sessionResult };
  }

  const permissionResult = await requirePermission(
    sessionResult.data,
    Permission.UPDATE_MAINTENANCE_STATUS,
    deps.teamFunctionsRepository,
    true
  );
  if (!permissionResult.success) {
    return { status: 403, body: permissionResult };
  }

  const parsed = parseUpdateMaintenanceRequestInput(
    request.requestId,
    request.body,
    sessionResult.data.organizationId ?? ""
  );
  if (!parsed.success) {
    return { status: mapErrorCodeToHttpStatus(parsed.code), body: parsed };
  }

  const updated = await deps.repository.updateMaintenanceRequest(parsed.data);
  if (updated === null) {
    return {
      status: 404,
      body: { success: false, code: "NOT_FOUND", error: "Maintenance request not found" }
    };
  }

  await logOperatorAuditEvent({
    session: sessionResult.data,
    actionKey: "services.maintenance.updated",
    entityType: "maintenance_request",
    entityId: updated.id,
    metadata: {
      unitId: updated.unitId,
      tenantId: updated.tenantId,
      priority: updated.priority,
      status: updated.status
    }
  });

  return { status: 200, body: { success: true, data: updated } };
}

export interface ListMaintenanceRequestsRequest {
  organizationId: string | null;
  unitId: string | null;
  status: string | null;
  session: AuthSession | null;
}

export interface ListMaintenanceRequestsResponse {
  status: number;
  body: ApiResult<ListMaintenanceRequestsOutput>;
}

export interface ListMaintenanceRequestsDeps {
  repository: MaintenanceRequestRepository;
  teamFunctionsRepository: TeamPermissionRepository;
}

export async function listMaintenanceRequests(
  request: ListMaintenanceRequestsRequest,
  deps: ListMaintenanceRequestsDeps
): Promise<ListMaintenanceRequestsResponse> {
  const sessionResult = requireOperatorSession(request.session);
  if (!sessionResult.success) {
    return { status: mapErrorCodeToHttpStatus(sessionResult.code), body: sessionResult };
  }

  const permissionResult = await requirePermission(
    sessionResult.data,
    Permission.VIEW_MAINTENANCE,
    deps.teamFunctionsRepository
  );
  if (!permissionResult.success) {
    return { status: 403, body: permissionResult };
  }

  const organizationId = request.organizationId ?? sessionResult.data.organizationId ?? "";

  if (organizationId !== sessionResult.data.organizationId) {
    return {
      status: 403,
      body: { success: false, code: "FORBIDDEN", error: "Organization mismatch" }
    };
  }

  const requests = await deps.repository.listMaintenanceRequests({
    organizationId,
    unitId: request.unitId ?? undefined,
    status: request.status ?? undefined
  });

  return { status: 200, body: { success: true, data: { requests } } };
}
