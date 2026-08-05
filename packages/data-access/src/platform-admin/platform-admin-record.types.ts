export type PlatformAdminStatus = "active" | "inactive";
export type PlatformUserAccountStatus = "active" | "suspended";
export type OrganizationPlatformStatus = "active" | "suspended";

export interface PlatformAdminRecord {
  userId: string;
  status: PlatformAdminStatus;
  createdAtIso: string;
  createdByUserId: string | null;
}

export interface PlatformUserStatusRecord {
  userId: string;
  status: PlatformUserAccountStatus;
  reason: string | null;
  updatedAtIso: string;
  updatedByUserId: string | null;
}

export interface PlatformAuditLogRecord {
  id: string;
  actorUserId: string;
  actionKey: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAtIso: string;
}

export interface CreatePlatformAuditLogInput {
  id: string;
  actorUserId: string;
  actionKey: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface PlatformUserListItem {
  userId: string;
  email: string | null;
  accountStatus: PlatformUserAccountStatus;
  membershipRoles: string[];
  organizationCount: number;
  ownerPortalAccessCount: number;
  isPlatformAdmin: boolean;
  createdAtIso: string | null;
}

export interface PlatformUserDetail {
  userId: string;
  email: string | null;
  accountStatus: PlatformUserAccountStatus;
  accountReason: string | null;
  isPlatformAdmin: boolean;
  memberships: Array<{
    id: string;
    organizationId: string;
    organizationName: string;
    organizationStatus: OrganizationPlatformStatus;
    role: string;
    status: string;
    createdAtIso: string;
  }>;
  ownerPortalAccesses: Array<{
    id: string;
    organizationId: string;
    ownerId: string;
    email: string;
    status: string;
    createdAtIso: string;
  }>;
}

export interface PlatformOrganizationListItem {
  id: string;
  name: string;
  status: OrganizationPlatformStatus;
  memberCount: number;
  propertyCount: number;
  createdAtIso: string;
}

export interface PlatformOrganizationHealth {
  memberCount: number;
  propertyCount: number;
  unitCount: number;
  activeLeaseCount: number;
  overduePaymentCount: number;
  openMaintenanceCount: number;
}

export interface PlatformOrganizationDetail {
  id: string;
  name: string;
  status: OrganizationPlatformStatus;
  createdAtIso: string;
  members: Array<{
    membershipId: string;
    userId: string;
    email: string | null;
    role: string;
    status: string;
    createdAtIso: string;
  }>;
  propertyCount: number;
  health: PlatformOrganizationHealth;
  recentOrgAudit: Array<{
    id: string;
    actionKey: string;
    entityType: string;
    entityId: string | null;
    actorUserId: string | null;
    createdAtIso: string;
  }>;
}

export interface ListPlatformAuditLogsInput {
  limit?: number;
  actionKey?: string | null;
  entityType?: string | null;
}

export interface PlatformOverviewStats {
  userCount: number;
  suspendedUserCount: number;
  organizationCount: number;
  activeOrganizationCount: number;
  suspendedOrganizationCount: number;
  recentPlatformAudit: PlatformAuditLogRecord[];
}

export interface ListPlatformUsersInput {
  search?: string | null;
  accountStatus?: PlatformUserAccountStatus | null;
  limit?: number;
  offset?: number;
}

export interface ListPlatformOrganizationsInput {
  search?: string | null;
  status?: OrganizationPlatformStatus | null;
  limit?: number;
  offset?: number;
}

export interface UpsertPlatformUserStatusInput {
  userId: string;
  status: PlatformUserAccountStatus;
  reason?: string | null;
  updatedByUserId: string;
}

export interface SetOrganizationStatusInput {
  organizationId: string;
  status: OrganizationPlatformStatus;
}

export interface GrantPlatformAdminInput {
  userId: string;
  createdByUserId?: string | null;
}

export interface PlatformAdminRepository {
  isActivePlatformAdmin(userId: string): Promise<boolean>;
  getPlatformUserStatus(userId: string): Promise<PlatformUserStatusRecord | null>;
  isUserSuspended(userId: string): Promise<boolean>;
  upsertPlatformUserStatus(input: UpsertPlatformUserStatusInput): Promise<PlatformUserStatusRecord>;
  setOrganizationStatus(input: SetOrganizationStatusInput): Promise<PlatformOrganizationListItem | null>;
  grantPlatformAdmin(input: GrantPlatformAdminInput): Promise<PlatformAdminRecord>;
  revokePlatformAdmin(userId: string): Promise<boolean>;
  createPlatformAuditLog(input: CreatePlatformAuditLogInput): Promise<PlatformAuditLogRecord>;
  listPlatformAuditLogs(input?: ListPlatformAuditLogsInput | number): Promise<PlatformAuditLogRecord[]>;
  getOverviewStats(): Promise<PlatformOverviewStats>;
  listUsers(input?: ListPlatformUsersInput): Promise<PlatformUserListItem[]>;
  getUserDetail(userId: string): Promise<PlatformUserDetail | null>;
  listOrganizations(input?: ListPlatformOrganizationsInput): Promise<PlatformOrganizationListItem[]>;
  getOrganizationDetail(organizationId: string): Promise<PlatformOrganizationDetail | null>;
  findUserIdByEmail(email: string): Promise<string | null>;
}
