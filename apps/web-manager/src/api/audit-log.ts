import type { AuthSession } from "@hhousing/api-contracts";
import { createAuditLogRepositoryFromEnv } from "@hhousing/data-access";

function createAuditId(): string {
  return `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function logOperatorAuditEvent(params: {
  session?: AuthSession;
  organizationId?: string;
  actorMemberId?: string | null;
  actionKey: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const auditRepository = createAuditLogRepositoryFromEnv(process.env);
    const resolvedOrganizationId = params.session?.organizationId ?? params.organizationId;
    if (!resolvedOrganizationId) {
      return;
    }

    const currentMembership = params.session
      ? params.session.memberships.find(
        (membership) => membership.organizationId === params.session?.organizationId
      )
      : null;

    await auditRepository.createAuditLog({
      id: createAuditId(),
      organizationId: resolvedOrganizationId,
      actorMemberId: params.actorMemberId ?? currentMembership?.id ?? null,
      actionKey: params.actionKey,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      metadata: params.metadata ?? {}
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = error instanceof Error ? (error as Error & { code?: string }).code : undefined;

    if (errorCode === "42P01" || errorMessage.includes("DATABASE_URL is required")) {
      return;
    }

    console.error("Failed to persist operator audit log", error);
  }
}
