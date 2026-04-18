import {
  parseCreateOwnerInvitationInput,
  type ApiResult,
  type AuthSession,
  type CreateOwnerInvitationOutput
} from "@hhousing/api-contracts";
import type {
  OrganizationPropertyUnitRepository,
  OwnerPortalAccessRepository
} from "@hhousing/data-access";
import { createHash, randomBytes } from "crypto";
import { logOperatorAuditEvent } from "../audit-log";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../shared";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function buildExpiryIso(daysFromNow: number): string {
  return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000).toISOString();
}

function buildActivationLink(baseUrl: string, token: string): string {
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}token=${encodeURIComponent(token)}`;
}

export interface InviteOwnerRequest {
  ownerId: string;
  body: unknown;
  session: AuthSession | null;
}

export interface InviteOwnerResponse {
  status: number;
  body: ApiResult<CreateOwnerInvitationOutput>;
}

export interface InviteOwnerDeps {
  repository: OwnerPortalAccessRepository;
  propertyRepository: OrganizationPropertyUnitRepository;
  createId: () => string;
  createToken?: () => string;
  inviteLinkBaseUrl: string;
  sendInvitationEmail?: (input: {
    to: string;
    ownerName: string;
    organizationName: string;
    activationLink: string;
  }) => Promise<void>;
}

export async function inviteOwner(
  request: InviteOwnerRequest,
  deps: InviteOwnerDeps
): Promise<InviteOwnerResponse> {
  const access = requireOperatorSession(request.session);
  if (!access.success) {
    return { status: mapErrorCodeToHttpStatus(access.code), body: access };
  }

  const owner = await deps.propertyRepository.getOwnerById(request.ownerId, access.data.organizationId);
  if (!owner || owner.ownerType !== "client") {
    return {
      status: 404,
      body: { success: false, code: "NOT_FOUND", error: "Owner not found" }
    };
  }

  const parsed = parseCreateOwnerInvitationInput(
    request.body,
    access.data.organizationId,
    request.ownerId
  );
  if (!parsed.success) {
    return { status: mapErrorCodeToHttpStatus(parsed.code), body: parsed };
  }

  const organization = await deps.propertyRepository.getOrganizationById(access.data.organizationId);
  if (!organization) {
    return {
      status: 404,
      body: { success: false, code: "NOT_FOUND", error: "Organization not found" }
    };
  }

  const token = deps.createToken ? deps.createToken() : randomBytes(24).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAtIso = buildExpiryIso(7);

  await deps.repository.revokeActiveOwnerInvitations(
    parsed.data.ownerId,
    parsed.data.organizationId,
    parsed.data.email
  );

  const invitation = await deps.repository.createOwnerInvitation({
    id: deps.createId(),
    ownerId: parsed.data.ownerId,
    organizationId: parsed.data.organizationId,
    email: parsed.data.email,
    tokenHash,
    expiresAtIso,
    createdByUserId: access.data.userId
  });

  const activationLink = buildActivationLink(deps.inviteLinkBaseUrl, token);

  if (deps.sendInvitationEmail) {
    await deps.sendInvitationEmail({
      to: invitation.email,
      ownerName: invitation.ownerName,
      organizationName: invitation.organizationName || organization.name,
      activationLink
    });
  }

  await logOperatorAuditEvent({
    organizationId: access.data.organizationId,
    actorMemberId: access.data.memberships.find((membership) => membership.organizationId === access.data.organizationId)?.id ?? null,
    actionKey: "operations.owner_invitation.sent",
    entityType: "owner_invitation",
    entityId: invitation.id,
    metadata: {
      ownerId: invitation.ownerId,
      email: invitation.email,
      expiresAtIso: invitation.expiresAtIso
    }
  });

  return {
    status: 201,
    body: {
      success: true,
      data: {
        invitationId: invitation.id,
        ownerId: invitation.ownerId,
        email: invitation.email,
        expiresAtIso: invitation.expiresAtIso,
        activationLink
      }
    }
  };
}
