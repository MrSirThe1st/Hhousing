export interface CreateAuditLogRecordInput {
  id: string;
  organizationId: string;
  actorMemberId: string | null;
  actionKey: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface AuditLogRecord {
  id: string;
  organizationId: string;
  actorMemberId: string | null;
  actorUserId: string | null;
  actionKey: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAtIso: string;
}

export interface ListAuditLogsByDayInput {
  organizationId: string;
  dayIso: string;
}

export interface AuditLogRepository {
  createAuditLog(input: CreateAuditLogRecordInput): Promise<AuditLogRecord>;
  listAuditLogsByDay(input: ListAuditLogsByDayInput): Promise<AuditLogRecord[]>;
}
