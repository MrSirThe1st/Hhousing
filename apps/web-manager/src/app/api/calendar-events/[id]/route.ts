import { parseUpdateCalendarEventInput } from "@hhousing/api-contracts";
import { logOperatorAuditEvent } from "../../../../api/audit-log";
import { extractAuthSessionFromCookies } from "../../../../auth/session-adapter";
import { filterCalendarEventsByScope, getScopedPortfolioData } from "../../../../lib/operator-scope-portfolio";
import { validateWorkflowEntitySelection } from "../../../../lib/workflow-entity-validation";
import { createCalendarEventRepo, jsonResponse, parseJsonBody } from "../../shared";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const session = await extractAuthSessionFromCookies();
  if (session === null) {
    return jsonResponse(401, { success: false, code: "UNAUTHORIZED", error: "Authentication required" });
  }

  if (session.role === "tenant") {
    return jsonResponse(403, { success: false, code: "FORBIDDEN", error: "Operator access required" });
  }

  const { id } = await params;
  const repository = createCalendarEventRepo();
  const existing = await repository.getCalendarEventById(id, session.organizationId);
  if (!existing) {
    return jsonResponse(404, { success: false, code: "NOT_FOUND", error: "Event not found" });
  }

  const scopedEvents = filterCalendarEventsByScope([existing], await getScopedPortfolioData(session));
  if (scopedEvents.length === 0) {
    return jsonResponse(404, { success: false, code: "NOT_FOUND", error: "Event not found" });
  }

  let body: unknown;
  try {
    body = await parseJsonBody(request);
  } catch {
    return jsonResponse(400, { success: false, code: "VALIDATION_ERROR", error: "Body must be valid JSON" });
  }

  const parsed = parseUpdateCalendarEventInput(body);
  if (!parsed.success) {
    return jsonResponse(400, parsed);
  }

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

  const updated = await repository.updateCalendarEvent({
    id,
    organizationId: session.organizationId,
    ...parsed.data
  });

  if (!updated) {
    return jsonResponse(404, { success: false, code: "NOT_FOUND", error: "Event not found" });
  }

  await logOperatorAuditEvent({
    organizationId: session.organizationId,
    actorMemberId: session.memberships.find((membership) => membership.organizationId === session.organizationId)?.id ?? null,
    actionKey: "operations.calendar_event.updated",
    entityType: "calendar_event",
    entityId: updated.id,
    metadata: {
      eventType: updated.eventType,
      status: updated.status
    }
  });

  return jsonResponse(200, { success: true, data: updated });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const session = await extractAuthSessionFromCookies();
  if (session === null) {
    return jsonResponse(401, { success: false, code: "UNAUTHORIZED", error: "Authentication required" });
  }

  if (session.role === "tenant") {
    return jsonResponse(403, { success: false, code: "FORBIDDEN", error: "Operator access required" });
  }

  const { id } = await params;
  const deleted = await createCalendarEventRepo().deleteCalendarEvent(id, session.organizationId);
  if (!deleted) {
    return jsonResponse(404, { success: false, code: "NOT_FOUND", error: "Event not found" });
  }

  await logOperatorAuditEvent({
    organizationId: session.organizationId,
    actorMemberId: session.memberships.find((membership) => membership.organizationId === session.organizationId)?.id ?? null,
    actionKey: "operations.calendar_event.deleted",
    entityType: "calendar_event",
    entityId: id,
    metadata: {}
  });

  return jsonResponse(200, { success: true, data: { success: true } });
}