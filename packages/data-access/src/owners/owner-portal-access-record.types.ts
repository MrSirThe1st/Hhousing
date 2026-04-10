export interface CreateOwnerInvitationRecordInput {
  id: string;
  ownerId: string;
  organizationId: string;
  email: string;
  tokenHash: string;
  expiresAtIso: string;
  createdByUserId: string;
}

export interface OwnerInvitationRecord {
  id: string;
  ownerId: string;
  organizationId: string;
  ownerName: string;
  organizationName: string;
  email: string;
  expiresAtIso: string;
  usedAtIso: string | null;
  revokedAtIso: string | null;
  createdAtIso: string;
}

export interface OwnerInvitationPreviewRecord {
  invitationId: string;
  ownerId: string;
  organizationId: string;
  ownerName: string;
  organizationName: string;
  email: string;
  expiresAtIso: string;
}

export interface CreateOwnerPortalAccessRecordInput {
  id: string;
  ownerId: string;
  organizationId: string;
  userId: string;
  email: string;
  invitedByUserId: string | null;
}

export interface OwnerPortalAccessRecord {
  id: string;
  ownerId: string;
  organizationId: string;
  userId: string;
  email: string;
  status: "active" | "inactive";
  createdAtIso: string;
}

export interface OwnerPortalAccessRepository {
  revokeActiveOwnerInvitations(ownerId: string, organizationId: string, email: string): Promise<void>;
  createOwnerInvitation(input: CreateOwnerInvitationRecordInput): Promise<OwnerInvitationRecord>;
  getOwnerInvitationPreviewByTokenHash(tokenHash: string): Promise<OwnerInvitationPreviewRecord | null>;
  markOwnerInvitationUsed(invitationId: string): Promise<void>;
  getOwnerPortalAccessByUserAndOwner(userId: string, ownerId: string, organizationId: string): Promise<OwnerPortalAccessRecord | null>;
  createOwnerPortalAccess(input: CreateOwnerPortalAccessRecordInput): Promise<OwnerPortalAccessRecord>;
  listOwnerPortalAccessesByUserId(userId: string): Promise<OwnerPortalAccessRecord[]>;
}
