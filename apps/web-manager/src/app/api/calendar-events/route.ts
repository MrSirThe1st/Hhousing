import { parseCreateCalendarEventInput } from "@hhousing/api-contracts";
import { logOperatorAuditEvent } from "../../../api/audit-log";
import { extractAuthSessionFromCookies } from "../../../auth/session-adapter";
import { filterCalendarEventsByScope, getScopedPortfolioData } from "../../../lib/operator-scope-portfolio";
import { validateWorkflowEntitySelection } from "../../../lib/workflow-entity-validation";
import { createCalendarEventRepo, createId, jsonResponse, parseJsonBody } from "../shared";

export async function GET(): Promise<Response> {
  const session = await extractAuthSessionFromCookies();
  if (session === null) {
    return jsonResponse(401, { success: false, code: "UNAUTHORIZED", error: "Authentication required" });
  }

  if (session.role === "tenant") {
    return jsonResponse(403, { success: false, code: "FORBIDDEN", error: "Operator access required" });
  }

  const [events, scopedPortfolio] = await Promise.all([
    createCalendarEventRepo().listCalendarEvents({ organizationId: session.organizationId }),
    getScopedPortfolioData(session)
  ]);

  return jsonResponse(200, {
    success: true,
    data: {
      events: filterCalendarEventsByScope(events, scopedPortfolio)
    }
  });
}

export async function POST(request: Request): Promise<Response> {
  const session = await extractAuthSessionFromCookies();
  if (session === null) {
    return jsonResponse(401, { success: false, code: "UNAUTHORIZED", error: "Authentication required" });
  }

  if (session.role === "tenant") {
    return jsonResponse(403, { success: false, code: "FORBIDDEN", error: "Operator access required" });
  }

  let body: unknown;
  try {
    body = await parseJsonBody(request);
  } catch {
    return jsonResponse(400, { success: false, code: "VALIDATION_ERROR", error: "Body must be valid JSON" });
  }

  const parsed = parseCreateCalendarEventInput(body);
  if (!parsed.success) {
    return jsonResponse(400, parsed);
  }

  if (parsed.data.organizationId !== session.organizationId) {
    return jsonResponse(403, { success: false, code: "FORBIDDEN", error: "Organization mismatch" });
  }

  const validation = await validateWorkflowEntitySelection(session, parsed.data);
  if (!validation.ok) {
    return jsonResponse(validation.status ?? 400, {
      success: false,
      code: validation.code ?? "VALIDATION_ERROR",
      error: validation.error ?? "Invalid workflow relation"
    });
  }

  const created = await createCalendarEventRepo().createCalendarEvent({
    id: createId("evt"),
    organizationId: parsed.data.organizationId,
    title: parsed.data.title,
    description: parsed.data.description,
    startAtIso: parsed.data.startAtIso,
    endAtIso: parsed.data.endAtIso,
    eventType: parsed.data.eventType,
    status: parsed.data.status,
    assignedUserId: parsed.data.assignedUserId ?? session.userId,
    relatedEntityType: parsed.data.relatedEntityType,
    relatedEntityId: parsed.data.relatedEntityId,
    propertyId: parsed.data.propertyId,
    unitId: parsed.data.unitId,
    leaseId: parsed.data.leaseId,
    tenantId: parsed.data.tenantId
  });

  await logOperatorAuditEvent({
    organizationId: session.organizationId,
    actorMemberId: session.memberships.find((membership) => membership.organizationId === session.organizationId)?.id ?? null,
    actionKey: "operations.calendar_event.created",
    entityType: "calendar_event",
    entityId: created.id,
    metadata: {
      eventType: created.eventType,
      status: created.status
    }
  });

  return jsonResponse(201, { success: true, data: created });
}