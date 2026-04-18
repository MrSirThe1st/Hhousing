import {
  Permission,
  TeamFunctionCode,
  parseAcceptTeamMemberInvitationInput,
  parseInvitePropertyManagerInput
} from "@hhousing/api-contracts";
import type {
  AcceptTeamMemberInvitationOutput,
  ApiResult,
  AuthSession,
  InvitePropertyManagerOutput,
  ListOrganizationMembersOutput,
  ListTeamMemberInvitationsOutput,
  TeamMemberInvitationPreview,
  ValidateTeamMemberInvitationOutput,
  TeamFunction
} from "@hhousing/api-contracts";
import { createAuditLogRepositoryFromEnv, type AuthRepository, TeamFunctionsRepository } from "@hhousing/data-access";
import { createHash, randomBytes } from "crypto";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../shared";

type SupabaseAdminUser = {
  id: string;
  email: string;
};

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

function createAuditId(): string {
  return `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function logTeamAuditEvent(params: {
  session: AuthSession;
  repository: AuthRepository;
  actionKey: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const auditRepository = createAuditLogRepositoryFromEnv(process.env);
    const currentMembership =
      params.session.memberships.find((membership) => membership.organizationId === params.session.organizationId) ??
      await params.repository.getMembershipByUserAndOrg(params.session.userId, params.session.organizationId);

    await auditRepository.createAuditLog({
      id: createAuditId(),
      organizationId: params.session.organizationId,
      actorMemberId: currentMembership?.id ?? null,
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

    console.error("Failed to persist audit log", error);
  }
}

function mapPreview(
  preview: Awaited<ReturnType<AuthRepository["getTeamMemberInvitationPreviewByTokenHash"]>>,
  accountExists: boolean
): TeamMemberInvitationPreview | null {
  if (preview === null) {
    return null;
  }

  return {
    invitationId: preview.invitationId,
    organizationId: preview.organizationId,
    organizationName: preview.organizationName,
    email: preview.email,
    role: preview.role,
    canOwnProperties: preview.canOwnProperties,
    expiresAtIso: preview.expiresAtIso,
    accountExists
  };
}

async function findSupabaseUserByEmail(
  supabaseAdminUrl: string,
  supabaseServiceRoleKey: string,
  email: string
): Promise<SupabaseAdminUser | null> {
  const response = await fetch(`${supabaseAdminUrl}/auth/v1/admin/users`, {
    method: "GET",
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`
    }
  });

  if (!response.ok) {
    throw new Error(`SUPABASE_LOOKUP_FAILED:${response.status}`);
  }

  const payload = (await response.json()) as { users?: SupabaseAdminUser[] };
  const normalizedEmail = email.toLowerCase();
  return payload.users?.find((item) => item.email.toLowerCase() === normalizedEmail) ?? null;
}

async function findSupabaseUserById(
  supabaseAdminUrl: string,
  supabaseServiceRoleKey: string,
  userId: string
): Promise<SupabaseAdminUser | null> {
  const response = await fetch(`${supabaseAdminUrl}/auth/v1/admin/users`, {
    method: "GET",
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`
    }
  });

  if (!response.ok) {
    throw new Error(`SUPABASE_LOOKUP_FAILED:${response.status}`);
  }

  const payload = (await response.json()) as { users?: SupabaseAdminUser[] };
  return payload.users?.find((item) => item.id === userId) ?? null;
}

async function hasSupabaseUserWithEmail(
  supabaseAdminUrl: string,
  supabaseServiceRoleKey: string,
  email: string
): Promise<boolean> {
  const user = await findSupabaseUserByEmail(supabaseAdminUrl, supabaseServiceRoleKey, email);
  return user !== null;
}

async function upsertSupabaseUser(params: {
  supabaseAdminUrl: string;
  supabaseServiceRoleKey: string;
  email: string;
  password: string;
  fullName: string;
}): Promise<string> {
  const existingUser = await findSupabaseUserByEmail(
    params.supabaseAdminUrl,
    params.supabaseServiceRoleKey,
    params.email
  );

  const endpoint = existingUser
    ? `${params.supabaseAdminUrl}/auth/v1/admin/users/${existingUser.id}`
    : `${params.supabaseAdminUrl}/auth/v1/admin/users`;
  const method = existingUser ? "PUT" : "POST";

  const response = await fetch(endpoint, {
    method,
    headers: {
      "content-type": "application/json",
      apikey: params.supabaseServiceRoleKey,
      Authorization: `Bearer ${params.supabaseServiceRoleKey}`
    },
    body: JSON.stringify({
      email: params.email,
      password: params.password,
      email_confirm: true,
      user_metadata: { full_name: params.fullName }
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SUPABASE_USER_UPSERT_FAILED:${response.status}:${text}`);
  }

  const payload = (await response.json()) as { id: string };
  return payload.id;
}

function isMissingTeamFunctionsSchema(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const maybeCode = (error as Error & { code?: string }).code;
  return maybeCode === "42P01";
}

function requireOperator(session: AuthSession): ApiResult<AuthSession> {
  if (session.role !== "landlord" && session.role !== "property_manager") {
    return {
      success: false,
      code: "FORBIDDEN",
      error: "Only operators can invite team members"
    };
  }

  return { success: true, data: session };
}

function memberHasPermission(permissions: string[], permission: Permission): boolean {
  if (permissions.includes("*")) {
    return true;
  }

  return permissions.includes(permission);
}

async function memberHasStrictTeamPermission(
  session: AuthSession,
  repository: AuthRepository,
  teamFunctionsRepository: TeamFunctionsRepository,
  permission: Permission
): Promise<boolean> {
  const membership = await repository.getMembershipByUserAndOrg(
    session.userId,
    session.organizationId
  );

  if (membership === null) {
    return false;
  }

  let functions: TeamFunction[] = [];
  try {
    functions = await teamFunctionsRepository.listMemberFunctions(membership.id);
  } catch (error) {
    if (isMissingTeamFunctionsSchema(error)) {
      return false;
    }

    throw error;
  }

  return functions.some((teamFunction) => memberHasPermission(teamFunction.permissions, permission));
}

async function requireTeamInviteAuthority(
  session: AuthSession,
  repository: AuthRepository,
  teamFunctionsRepository?: TeamFunctionsRepository
): Promise<ApiResult<AuthSession>> {
  if (session.role === "landlord") {
    return { success: true, data: session };
  }

  if (session.role !== "property_manager") {
    return {
      success: false,
      code: "FORBIDDEN",
      error: "Only the account owner can manage team invitations"
    };
  }

  const currentMembership = await repository.getMembershipByUserAndOrg(
    session.userId,
    session.organizationId
  );

  if (currentMembership === null) {
    return {
      success: false,
      code: "FORBIDDEN",
      error: "Only the account owner can manage team invitations"
    };
  }

  const operatorMemberships = (await repository.listMembershipsByOrganization(session.organizationId))
    .filter((membership) => membership.role === "landlord" || membership.role === "property_manager")
    .sort(
      (left, right) =>
        new Date(left.createdAtIso).getTime() - new Date(right.createdAtIso).getTime()
    );

  const accountOwnerMembership = operatorMemberships[0];
  if (accountOwnerMembership?.id === currentMembership.id) {
    return { success: true, data: session };
  }

  if (
    teamFunctionsRepository &&
    (await memberHasStrictTeamPermission(
      session,
      repository,
      teamFunctionsRepository,
      Permission.MANAGE_TEAM
    ))
  ) {
    return { success: true, data: session };
  }

  if (accountOwnerMembership?.id !== currentMembership.id) {
    return {
      success: false,
      code: "FORBIDDEN",
      error: "Only the account owner or an admin can manage team invitations"
    };
  }

  return { success: true, data: session };
}

async function createAndSendTeamMemberInvitation(params: {
  repository: AuthRepository;
  createId: () => string;
  createToken?: () => string;
  inviteLinkBaseUrl: string;
  sendInvitationEmail?: (input: {
    to: string;
    organizationName: string;
    activationLink: string;
  }) => Promise<void>;
  organizationId: string;
  email: string;
  role: "property_manager";
  canOwnProperties: boolean;
  createdByUserId: string;
}): Promise<InvitePropertyManagerOutput> {
  const token = params.createToken ? params.createToken() : randomBytes(24).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAtIso = buildExpiryIso(7);

  await params.repository.revokeActiveTeamMemberInvitations(
    params.email,
    params.organizationId
  );

  const invitation = await params.repository.createTeamMemberInvitation({
    id: params.createId(),
    organizationId: params.organizationId,
    email: params.email,
    role: params.role,
    canOwnProperties: params.canOwnProperties,
    tokenHash,
    expiresAtIso,
    createdByUserId: params.createdByUserId
  });

  const activationLink = buildActivationLink(params.inviteLinkBaseUrl, token);

  if (params.sendInvitationEmail) {
    await params.sendInvitationEmail({
      to: invitation.email,
      organizationName: invitation.organizationName,
      activationLink
    });
  }

  return {
    invitationId: invitation.id,
    email: invitation.email,
    role: invitation.role,
    canOwnProperties: invitation.canOwnProperties,
    expiresAtIso: invitation.expiresAtIso,
    activationLink
  };
}

/**
 * Validate function assignment escalation
 * - LEASING_AGENT, ACCOUNTANT, MAINTENANCE_MANAGER: anyone can assign
 * - ADMIN: only landlord can assign
 */
function validateFunctionEscalation(
  inviterRole: "landlord" | "property_manager",
  functionCode: TeamFunctionCode
): ApiResult<void> {
  const adminOnlyFunctions: TeamFunctionCode[] = [TeamFunctionCode.ADMIN];

  if (adminOnlyFunctions.includes(functionCode) && inviterRole !== "landlord") {
    return {
      success: false,
      code: "FORBIDDEN",
      error: `Only landlords can assign the ${functionCode} function`
    };
  }

  return { success: true, data: undefined };
}

export interface ListOrganizationMembersRequest {
  session: AuthSession | null;
  organizationId: string | null;
}

export interface ListOrganizationMembersResponse {
  status: number;
  body: ApiResult<ListOrganizationMembersOutput>;
}

export interface ListOrganizationMembersDeps {
  repository: AuthRepository;
}

export async function listOrganizationMembers(
  request: ListOrganizationMembersRequest,
  deps: ListOrganizationMembersDeps
): Promise<ListOrganizationMembersResponse> {
  const sessionResult = requireOperatorSession(request.session);
  if (!sessionResult.success) {
    return { status: mapErrorCodeToHttpStatus(sessionResult.code), body: sessionResult };
  }

  const organizationId = request.organizationId ?? sessionResult.data.organizationId;
  if (organizationId !== sessionResult.data.organizationId) {
    return {
      status: 403,
      body: { success: false, code: "FORBIDDEN", error: "Organization mismatch" }
    };
  }

  const memberships = await deps.repository
    .listMembershipsByOrganization(organizationId)
    .then((items) => items.filter((membership) => membership.role !== "tenant"));
  return { status: 200, body: { success: true, data: { memberships } } };
}

export interface ListTeamMemberInvitationsRequest {
  session: AuthSession | null;
  organizationId: string | null;
}

export interface ListTeamMemberInvitationsResponse {
  status: number;
  body: ApiResult<ListTeamMemberInvitationsOutput>;
}

export interface ListTeamMemberInvitationsDeps {
  repository: AuthRepository;
}

export async function listTeamMemberInvitations(
  request: ListTeamMemberInvitationsRequest,
  deps: ListTeamMemberInvitationsDeps
): Promise<ListTeamMemberInvitationsResponse> {
  const sessionResult = requireOperatorSession(request.session);
  if (!sessionResult.success) {
    return { status: mapErrorCodeToHttpStatus(sessionResult.code), body: sessionResult };
  }

  const organizationId = request.organizationId ?? sessionResult.data.organizationId;
  if (organizationId !== sessionResult.data.organizationId) {
    return {
      status: 403,
      body: { success: false, code: "FORBIDDEN", error: "Organization mismatch" }
    };
  }

  const invitations = await deps.repository.listTeamMemberInvitationsByOrganization(organizationId);
  return { status: 200, body: { success: true, data: { invitations } } };
}

export interface InvitePropertyManagerRequest {
  body: unknown;
  session: AuthSession | null;
}

export interface InvitePropertyManagerResponse {
  status: number;
  body: ApiResult<InvitePropertyManagerOutput>;
}

export interface InvitePropertyManagerDeps {
  repository: AuthRepository;
  teamFunctionsRepository?: TeamFunctionsRepository;
  createId: () => string;
  createToken?: () => string;
  inviteLinkBaseUrl: string;
  sendInvitationEmail?: (input: {
    to: string;
    organizationName: string;
    activationLink: string;
  }) => Promise<void>;
}

export async function invitePropertyManager(
  request: InvitePropertyManagerRequest,
  deps: InvitePropertyManagerDeps
): Promise<InvitePropertyManagerResponse> {
  const sessionResult = requireOperatorSession(request.session);
  if (!sessionResult.success) {
    return { status: mapErrorCodeToHttpStatus(sessionResult.code), body: sessionResult };
  }

  const operatorResult = await requireTeamInviteAuthority(
    sessionResult.data,
    deps.repository,
    deps.teamFunctionsRepository
  );
  if (!operatorResult.success) {
    return { status: mapErrorCodeToHttpStatus(operatorResult.code), body: operatorResult };
  }

  const parsed = parseInvitePropertyManagerInput(
    request.body,
    sessionResult.data.organizationId
  );
  if (!parsed.success) {
    return { status: mapErrorCodeToHttpStatus(parsed.code), body: parsed };
  }

  const output = await createAndSendTeamMemberInvitation({
    repository: deps.repository,
    createId: deps.createId,
    createToken: deps.createToken,
    inviteLinkBaseUrl: deps.inviteLinkBaseUrl,
    sendInvitationEmail: deps.sendInvitationEmail,
    organizationId: parsed.data.organizationId,
    email: parsed.data.email,
    role: parsed.data.role,
    canOwnProperties: parsed.data.canOwnProperties,
    createdByUserId: sessionResult.data.userId
  });

  await logTeamAuditEvent({
    session: sessionResult.data,
    repository: deps.repository,
    actionKey: "team.invitation.sent",
    entityType: "team_invitation",
    entityId: output.invitationId,
    metadata: {
      email: output.email,
      role: output.role,
      canOwnProperties: output.canOwnProperties
    }
  });

  return {
    status: 201,
    body: {
      success: true,
      data: output
    }
  };
}

export interface ValidateTeamMemberInvitationRequest {
  token: string | null;
}

export interface ValidateTeamMemberInvitationResponse {
  status: number;
  body: ApiResult<ValidateTeamMemberInvitationOutput>;
}

export interface ValidateTeamMemberInvitationDeps {
  repository: AuthRepository;
  supabaseAdminUrl?: string;
  supabaseServiceRoleKey?: string;
}

export async function validateTeamMemberInvitation(
  request: ValidateTeamMemberInvitationRequest,
  deps: ValidateTeamMemberInvitationDeps
): Promise<ValidateTeamMemberInvitationResponse> {
  const token = request.token?.trim();
  if (!token) {
    return {
      status: 400,
      body: { success: false, code: "VALIDATION_ERROR", error: "token is required" }
    };
  }

  const preview = await deps.repository.getTeamMemberInvitationPreviewByTokenHash(hashToken(token));
  if (preview === null) {
    return {
      status: 404,
      body: { success: false, code: "NOT_FOUND", error: "Invitation not found or expired" }
    };
  }

  let accountExists = false;
  if (deps.supabaseAdminUrl && deps.supabaseServiceRoleKey) {
    accountExists = await hasSupabaseUserWithEmail(
      deps.supabaseAdminUrl,
      deps.supabaseServiceRoleKey,
      preview.email
    );
  }

  return {
    status: 200,
    body: {
      success: true,
      data: {
        invitation: mapPreview(preview, accountExists) as TeamMemberInvitationPreview
      }
    }
  };
}

export interface AcceptTeamMemberInvitationRequest {
  body: unknown;
  session: AuthSession | null;
}

export interface AcceptTeamMemberInvitationResponse {
  status: number;
  body: ApiResult<AcceptTeamMemberInvitationOutput>;
}

export interface AcceptTeamMemberInvitationDeps {
  repository: AuthRepository;
  createMembershipId: () => string;
  supabaseAdminUrl: string;
  supabaseServiceRoleKey: string;
}

export async function acceptTeamMemberInvitation(
  request: AcceptTeamMemberInvitationRequest,
  deps: AcceptTeamMemberInvitationDeps
): Promise<AcceptTeamMemberInvitationResponse> {
  const parsed = parseAcceptTeamMemberInvitationInput(request.body);
  if (!parsed.success) {
    return { status: mapErrorCodeToHttpStatus(parsed.code), body: parsed };
  }

  const preview = await deps.repository.getTeamMemberInvitationPreviewByTokenHash(
    hashToken(parsed.data.token)
  );
  if (preview === null) {
    return {
      status: 404,
      body: { success: false, code: "NOT_FOUND", error: "Invitation not found or expired" }
    };
  }

  let userId: string;

  if (request.session !== null) {
    const signedInUser = await findSupabaseUserById(
      deps.supabaseAdminUrl,
      deps.supabaseServiceRoleKey,
      request.session.userId
    );

    if (signedInUser === null || signedInUser.email.toLowerCase() !== preview.email.toLowerCase()) {
      return {
        status: 403,
        body: {
          success: false,
          code: "FORBIDDEN",
          error: "Signed-in account does not match the invitation email"
        }
      };
    }

    userId = request.session.userId;
  } else {
    if (!parsed.data.fullName || !parsed.data.password) {
      return {
        status: 400,
        body: {
          success: false,
          code: "VALIDATION_ERROR",
          error: "fullName and password are required when creating a new account"
        }
      };
    }

    const existingSupabaseUser = await findSupabaseUserByEmail(
      deps.supabaseAdminUrl,
      deps.supabaseServiceRoleKey,
      preview.email
    );

    if (existingSupabaseUser !== null) {
      return {
        status: 409,
        body: {
          success: false,
          code: "FORBIDDEN",
          error: "An account already exists for this email. Sign in to accept the invitation"
        }
      };
    }

    userId = await upsertSupabaseUser({
      supabaseAdminUrl: deps.supabaseAdminUrl,
      supabaseServiceRoleKey: deps.supabaseServiceRoleKey,
      email: preview.email,
      password: parsed.data.password,
      fullName: parsed.data.fullName
    });
  }

  const existingMembership = await deps.repository.getMembershipByUserAndOrg(
    userId,
    preview.organizationId
  );

  if (existingMembership && existingMembership.role !== preview.role) {
    return {
      status: 409,
      body: {
        success: false,
        code: "FORBIDDEN",
        error: "User already belongs to this organization with another role"
      }
    };
  }

  const membership =
    existingMembership ??
    (await deps.repository.createOrganizationMembership({
      id: deps.createMembershipId(),
      organizationId: preview.organizationId,
      userId,
      role: preview.role,
      status: "active",
      canOwnProperties: preview.canOwnProperties
    }));

  await deps.repository.markTeamMemberInvitationUsed(preview.invitationId);

  return {
    status: 200,
    body: {
      success: true,
      data: {
        userId,
        organizationId: preview.organizationId,
        membershipId: membership.id
      }
    }
  };
}

export interface ResendTeamMemberInvitationRequest {
  invitationId: string;
  session: AuthSession | null;
}

export interface ResendTeamMemberInvitationResponse {
  status: number;
  body: ApiResult<InvitePropertyManagerOutput>;
}

export interface ResendTeamMemberInvitationDeps extends InvitePropertyManagerDeps {}

export async function resendTeamMemberInvitation(
  request: ResendTeamMemberInvitationRequest,
  deps: ResendTeamMemberInvitationDeps
): Promise<ResendTeamMemberInvitationResponse> {
  const sessionResult = requireOperatorSession(request.session);
  if (!sessionResult.success) {
    return { status: mapErrorCodeToHttpStatus(sessionResult.code), body: sessionResult };
  }

  const authorityResult = await requireTeamInviteAuthority(
    sessionResult.data,
    deps.repository,
    deps.teamFunctionsRepository
  );
  if (!authorityResult.success) {
    return { status: mapErrorCodeToHttpStatus(authorityResult.code), body: authorityResult };
  }

  const invitation = (await deps.repository.listTeamMemberInvitationsByOrganization(
    sessionResult.data.organizationId
  )).find((item) => item.id === request.invitationId);

  if (!invitation) {
    return {
      status: 404,
      body: { success: false, code: "NOT_FOUND", error: "Invitation not found" }
    };
  }

  if (invitation.usedAtIso !== null) {
    return {
      status: 409,
      body: { success: false, code: "FORBIDDEN", error: "Accepted invitations cannot be resent" }
    };
  }

  const output = await createAndSendTeamMemberInvitation({
    repository: deps.repository,
    createId: deps.createId,
    createToken: deps.createToken,
    inviteLinkBaseUrl: deps.inviteLinkBaseUrl,
    sendInvitationEmail: deps.sendInvitationEmail,
    organizationId: sessionResult.data.organizationId,
    email: invitation.email,
    role: invitation.role,
    canOwnProperties: invitation.canOwnProperties,
    createdByUserId: sessionResult.data.userId
  });

  await logTeamAuditEvent({
    session: sessionResult.data,
    repository: deps.repository,
    actionKey: "team.invitation.resent",
    entityType: "team_invitation",
    entityId: output.invitationId,
    metadata: {
      previousInvitationId: invitation.id,
      email: output.email,
      role: output.role
    }
  });

  return { status: 200, body: { success: true, data: output } };
}

export interface RevokeTeamMemberInvitationRequest {
  invitationId: string;
  session: AuthSession | null;
}

export interface RevokeTeamMemberInvitationResponse {
  status: number;
  body: ApiResult<{ invitationId: string }>;
}

export interface RevokeTeamMemberInvitationDeps {
  repository: AuthRepository;
  teamFunctionsRepository?: TeamFunctionsRepository;
}

export async function revokeTeamMemberInvitation(
  request: RevokeTeamMemberInvitationRequest,
  deps: RevokeTeamMemberInvitationDeps
): Promise<RevokeTeamMemberInvitationResponse> {
  const sessionResult = requireOperatorSession(request.session);
  if (!sessionResult.success) {
    return { status: mapErrorCodeToHttpStatus(sessionResult.code), body: sessionResult };
  }

  const authorityResult = await requireTeamInviteAuthority(
    sessionResult.data,
    deps.repository,
    deps.teamFunctionsRepository
  );
  if (!authorityResult.success) {
    return { status: mapErrorCodeToHttpStatus(authorityResult.code), body: authorityResult };
  }

  const invitation = (await deps.repository.listTeamMemberInvitationsByOrganization(
    sessionResult.data.organizationId
  )).find((item) => item.id === request.invitationId);

  if (!invitation) {
    return {
      status: 404,
      body: { success: false, code: "NOT_FOUND", error: "Invitation not found" }
    };
  }

  if (invitation.usedAtIso !== null) {
    return {
      status: 409,
      body: { success: false, code: "FORBIDDEN", error: "Accepted invitations cannot be revoked" }
    };
  }

  await deps.repository.revokeActiveTeamMemberInvitations(
    invitation.email,
    sessionResult.data.organizationId
  );

  await logTeamAuditEvent({
    session: sessionResult.data,
    repository: deps.repository,
    actionKey: "team.invitation.revoked",
    entityType: "team_invitation",
    entityId: request.invitationId,
    metadata: {
      email: invitation.email,
      role: invitation.role
    }
  });

  return {
    status: 200,
    body: { success: true, data: { invitationId: request.invitationId } }
  };
}

export interface UpdateMemberFunctionsRequest {
  memberId: string;
  body: unknown;
  session: AuthSession | null;
}

export interface UpdateMemberFunctionsResponse {
  status: number;
  body: ApiResult<{ functions: TeamFunction[] }>;
}

export interface UpdateMemberFunctionsDeps {
  repository: AuthRepository;
  teamFunctionsRepository: TeamFunctionsRepository;
}

export async function updateMemberFunctions(
  request: UpdateMemberFunctionsRequest,
  deps: UpdateMemberFunctionsDeps
): Promise<UpdateMemberFunctionsResponse> {
  const sessionResult = requireOperatorSession(request.session);
  if (!sessionResult.success) {
    return { status: mapErrorCodeToHttpStatus(sessionResult.code), body: sessionResult };
  }

  const operatorResult = requireOperator(sessionResult.data);
  if (!operatorResult.success) {
    return { status: mapErrorCodeToHttpStatus(operatorResult.code), body: operatorResult };
  }

  const authorityResult = await requireTeamInviteAuthority(
    sessionResult.data,
    deps.repository,
    deps.teamFunctionsRepository
  );
  if (!authorityResult.success) {
    return { status: mapErrorCodeToHttpStatus(authorityResult.code), body: authorityResult };
  }

  // Parse the incoming function codes
  if (!Array.isArray((request.body as Record<string, unknown>)?.functions)) {
    return {
      status: 400,
      body: { success: false, code: "VALIDATION_ERROR", error: "functions must be an array" }
    };
  }

  const rawFunctions = (request.body as { functions: unknown[] }).functions;
  const validCodes = Object.values(TeamFunctionCode) as string[];
  const newFunctionCodes: TeamFunctionCode[] = [];

  for (const item of rawFunctions) {
    if (typeof item !== "string" || !validCodes.includes(item)) {
      return {
        status: 400,
        body: { success: false, code: "VALIDATION_ERROR", error: `Invalid function code: ${String(item)}` }
      };
    }
    newFunctionCodes.push(item as TeamFunctionCode);
  }

  // Verify the target membership exists and belongs to the same org
  const membership = await deps.repository.getMembershipById(request.memberId);
  if (!membership || membership.organizationId !== sessionResult.data.organizationId) {
    return {
      status: 404,
      body: { success: false, code: "NOT_FOUND", error: "Member not found" }
    };
  }

  // Landlords cannot have functions
  if (membership.role === "landlord") {
    return {
      status: 400,
      body: { success: false, code: "VALIDATION_ERROR", error: "Landlords cannot have functions" }
    };
  }

  // property_manager must keep at least one function
  if (newFunctionCodes.length === 0) {
    return {
      status: 400,
      body: { success: false, code: "VALIDATION_ERROR", error: "Select at least one function for a property manager" }
    };
  }

  // Validate escalation: property_manager cannot assign ADMIN
  for (const functionCode of newFunctionCodes) {
    const escalationCheck = validateFunctionEscalation(
      sessionResult.data.role as "landlord" | "property_manager",
      functionCode
    );
    if (!escalationCheck.success) {
      return { status: mapErrorCodeToHttpStatus(escalationCheck.code), body: escalationCheck };
    }
  }

  let organizationFunctions: Awaited<
    ReturnType<UpdateMemberFunctionsDeps["teamFunctionsRepository"]["listFunctionsByOrganization"]>
  >;

  try {
    organizationFunctions = await deps.teamFunctionsRepository.listFunctionsByOrganization(
      sessionResult.data.organizationId
    );
  } catch (error) {
    if (!isMissingTeamFunctionsSchema(error)) {
      throw error;
    }
    return {
      status: 503,
      body: { success: false, code: "INTERNAL_ERROR", error: "Team permissions schema is missing. Apply migrations 0009 and 0010." }
    };
  }

  const functionsByCode = new Map(
    organizationFunctions.map((teamFunction) => [teamFunction.functionCode, teamFunction])
  );

  for (const functionCode of newFunctionCodes) {
    if (!functionsByCode.has(functionCode)) {
      return {
        status: 400,
        body: { success: false, code: "VALIDATION_ERROR", error: `Unknown function for this organization: ${functionCode}` }
      };
    }
  }

  // Replace: clear all current functions then assign the new set
  await deps.teamFunctionsRepository.clearMemberFunctions(request.memberId);

  const assignedFunctions: TeamFunction[] = [];
  for (const functionCode of newFunctionCodes) {
    const functionDefinition = functionsByCode.get(functionCode);
    if (!functionDefinition) continue;
    await deps.teamFunctionsRepository.assignFunctionToMember(
      request.memberId,
      functionDefinition.id,
      sessionResult.data.organizationId,
      sessionResult.data.userId
    );
    assignedFunctions.push(functionDefinition);
  }

  await logTeamAuditEvent({
    session: sessionResult.data,
    repository: deps.repository,
    actionKey: "team.member.functions_updated",
    entityType: "organization_membership",
    entityId: request.memberId,
    metadata: {
      memberRole: membership.role,
      functionCodes: newFunctionCodes,
      functionLabels: assignedFunctions.map((teamFunction) => teamFunction.displayName)
    }
  });

  return { status: 200, body: { success: true, data: { functions: assignedFunctions } } };
}

export interface LookupUserByEmailRequest {
  body: unknown;
  session: AuthSession | null;
}

export interface LookupUserByEmailResponse {
  status: number;
  body: ApiResult<{ userId: string; email: string }>;
}

export interface LookupUserByEmailDeps {
  supabaseAdminUrl: string;
  supabaseServiceRoleKey: string;
}

export async function lookupUserByEmail(
  request: LookupUserByEmailRequest,
  deps: LookupUserByEmailDeps
): Promise<LookupUserByEmailResponse> {
  const sessionResult = requireOperatorSession(request.session);
  if (!sessionResult.success) {
    return { status: mapErrorCodeToHttpStatus(sessionResult.code), body: sessionResult };
  }

  const { parseLookupUserByEmailInput } = await import("@hhousing/api-contracts");
  const parsed = parseLookupUserByEmailInput(request.body);
  if (!parsed.success) {
    return { status: mapErrorCodeToHttpStatus(parsed.code), body: parsed };
  }

  try {
    // Call Supabase Admin API to lookup user by email
    const adminUrl = deps.supabaseAdminUrl;
    const serviceRoleKey = deps.supabaseServiceRoleKey;

    const response = await fetch(`${adminUrl}/auth/v1/admin/users`, {
      method: "GET",
      headers: {
        authorization: `Bearer ${serviceRoleKey}`,
        "content-type": "application/json"
      }
    });

    if (!response.ok) {
      return {
        status: 500,
        body: {
          success: false,
          code: "INTERNAL_ERROR",
          error: "Failed to query user directory"
        }
      };
    }

    const data = (await response.json()) as { users?: Array<{ id: string; email: string }> };
    const users = data.users ?? [];

    const matchingUser = users.find(
      (u) => u.email && u.email.toLowerCase() === parsed.data.email.toLowerCase()
    );

    if (!matchingUser) {
      return {
        status: 404,
        body: {
          success: false,
          code: "NOT_FOUND",
          error: `No user found with email: ${parsed.data.email}`
        }
      };
    }

    return {
      status: 200,
      body: {
        success: true,
        data: {
          userId: matchingUser.id,
          email: matchingUser.email
        }
      }
    };
  } catch (error) {
    console.error("Lookup user by email error:", error);
    return {
      status: 500,
      body: {
        success: false,
        code: "INTERNAL_ERROR",
        error: "Failed to lookup user"
      }
    };
  }
}
