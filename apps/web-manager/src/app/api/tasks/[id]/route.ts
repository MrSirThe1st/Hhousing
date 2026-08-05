import { parseUpdateTaskInput } from "@hhousing/api-contracts";
import { logOperatorAuditEvent } from "../../../../api/audit-log";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../../../../api/shared";
import { extractAuthSessionFromCookies } from "../../../../auth/session-adapter";
import { filterTasksByScope, getScopedPortfolioData } from "../../../../lib/operator-scope-portfolio";
import { validateWorkflowEntitySelection } from "../../../../lib/workflow-entity-validation";
import { createTaskRepo, jsonResponse, parseJsonBody } from "../../shared";

function hasRelationFieldUpdate(payload: Record<string, unknown>): boolean {
  return (
    Object.prototype.hasOwnProperty.call(payload, "propertyId")
    || Object.prototype.hasOwnProperty.call(payload, "unitId")
    || Object.prototype.hasOwnProperty.call(payload, "leaseId")
    || Object.prototype.hasOwnProperty.call(payload, "tenantId")
    || Object.prototype.hasOwnProperty.call(payload, "relatedEntityType")
    || Object.prototype.hasOwnProperty.call(payload, "relatedEntityId")
  );
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const access = requireOperatorSession(await extractAuthSessionFromCookies());
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }
  const session = access.data;

  const { id } = await params;
  const repository = createTaskRepo();
  const existing = await repository.getTaskById(id, session.organizationId);
  if (!existing) {
    return jsonResponse(404, { success: false, code: "NOT_FOUND", error: "Task not found" });
  }

  const scopedTasks = filterTasksByScope([existing], await getScopedPortfolioData(session));
  if (scopedTasks.length === 0) {
    return jsonResponse(404, { success: false, code: "NOT_FOUND", error: "Task not found" });
  }

  let body: unknown;
  try {
    body = await parseJsonBody(request);
  } catch {
    return jsonResponse(400, { success: false, code: "VALIDATION_ERROR", error: "Body must be valid JSON" });
  }

  const parsed = parseUpdateTaskInput(body);
  if (!parsed.success) {
    return jsonResponse(400, parsed);
  }

  // Allow status/priority/title updates even when existing relation fields are legacy-inconsistent.
  if (hasRelationFieldUpdate(parsed.data as Record<string, unknown>)) {
    const validation = await validateWorkflowEntitySelection(session, {
      propertyId: parsed.data.propertyId ?? existing.propertyId,
      unitId: parsed.data.unitId ?? existing.unitId,
      leaseId: parsed.data.leaseId ?? existing.leaseId,
      tenantId: parsed.data.tenantId ?? existing.tenantId,
      relatedEntityType: parsed.data.relatedEntityType ?? existing.relatedEntityType,
      relatedEntityId: parsed.data.relatedEntityId ?? existing.relatedEntityId
    });

    if (!validation.ok) {
      return jsonResponse(validation.status ?? 400, {
        success: false,
        code: validation.code ?? "VALIDATION_ERROR",
        error: validation.error ?? "Invalid workflow relation"
      });
    }
  }

  const updated = await repository.updateTask({
    id,
    organizationId: session.organizationId,
    ...parsed.data
  });

  if (!updated) {
    return jsonResponse(404, { success: false, code: "NOT_FOUND", error: "Task not found" });
  }

  await logOperatorAuditEvent({
    organizationId: session.organizationId,
    actorMemberId: session.memberships.find((membership) => membership.organizationId === session.organizationId)?.id ?? null,
    actionKey: "operations.task.updated",
    entityType: "task",
    entityId: updated.id,
    metadata: {
      status: updated.status,
      priority: updated.priority
    }
  });

  return jsonResponse(200, { success: true, data: updated });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const access = requireOperatorSession(await extractAuthSessionFromCookies());
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }
  const session = access.data;

  const { id } = await params;
  const deleted = await createTaskRepo().deleteTask(id, session.organizationId);
  if (!deleted) {
    return jsonResponse(404, { success: false, code: "NOT_FOUND", error: "Task not found" });
  }

  await logOperatorAuditEvent({
    organizationId: session.organizationId,
    actorMemberId: session.memberships.find((membership) => membership.organizationId === session.organizationId)?.id ?? null,
    actionKey: "operations.task.deleted",
    entityType: "task",
    entityId: id,
    metadata: {}
  });

  return jsonResponse(200, { success: true, data: { success: true } });
}