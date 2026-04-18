import { parseCreateTaskInput } from "@hhousing/api-contracts";
import { logOperatorAuditEvent } from "../../../api/audit-log";
import { extractAuthSessionFromCookies } from "../../../auth/session-adapter";
import { syncSystemTasks } from "../../../lib/dashboard-workflow";
import { filterTasksByScope, getScopedPortfolioData } from "../../../lib/operator-scope-portfolio";
import { validateWorkflowEntitySelection } from "../../../lib/workflow-entity-validation";
import { createId, createTaskRepo, jsonResponse, parseJsonBody } from "../shared";

export async function GET(): Promise<Response> {
  const session = await extractAuthSessionFromCookies();
  if (session === null) {
    return jsonResponse(401, { success: false, code: "UNAUTHORIZED", error: "Authentication required" });
  }

  if (session.role === "tenant") {
    return jsonResponse(403, { success: false, code: "FORBIDDEN", error: "Operator access required" });
  }

  await syncSystemTasks(session);

  const [tasks, scopedPortfolio] = await Promise.all([
    createTaskRepo().listTasks({ organizationId: session.organizationId }),
    getScopedPortfolioData(session)
  ]);

  return jsonResponse(200, {
    success: true,
    data: {
      tasks: filterTasksByScope(tasks, scopedPortfolio)
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

  const parsed = parseCreateTaskInput(body);
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

  const created = await createTaskRepo().createTask({
    id: createId("tsk"),
    organizationId: parsed.data.organizationId,
    title: parsed.data.title,
    description: parsed.data.description,
    priority: parsed.data.priority,
    dueDate: parsed.data.dueDate,
    status: "open",
    assignedUserId: parsed.data.assignedUserId ?? session.userId,
    relatedEntityType: parsed.data.relatedEntityType,
    relatedEntityId: parsed.data.relatedEntityId,
    propertyId: parsed.data.propertyId,
    unitId: parsed.data.unitId,
    leaseId: parsed.data.leaseId,
    tenantId: parsed.data.tenantId,
    source: "manual"
  });

  await logOperatorAuditEvent({
    organizationId: session.organizationId,
    actorMemberId: session.memberships.find((membership) => membership.organizationId === session.organizationId)?.id ?? null,
    actionKey: "operations.task.created",
    entityType: "task",
    entityId: created.id,
    metadata: {
      relatedEntityType: created.relatedEntityType,
      relatedEntityId: created.relatedEntityId,
      priority: created.priority
    }
  });

  return jsonResponse(201, { success: true, data: created });
}