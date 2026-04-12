import {
  Permission,
  parseAcceptTenantInvitationInput,
  type AcceptTenantInvitationOutput,
  type CreateTenantInvitationOutput,
  type TenantInvitationPreview,
  type ValidateTenantInvitationOutput,
  type ApiResult,
  type AuthSession
} from "@hhousing/api-contracts";
import type { AuthRepository, OrganizationPropertyUnitRepository, TenantLeaseRepository } from "@hhousing/data-access";
import { createHash, randomBytes } from "crypto";
import { requirePermission, type TeamPermissionRepository } from "../organizations/permissions";
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

function mapPreview(preview: Awaited<ReturnType<TenantLeaseRepository["getTenantInvitationPreviewByTokenHash"]>>): TenantInvitationPreview | null {
  if (preview === null) {
    return null;
  }

  return {
    invitationId: preview.invitationId,
    tenantId: preview.tenantId,
    organizationId: preview.organizationId,
    organizationName: preview.organizationName,
    tenantFullName: preview.tenantFullName,
    tenantEmail: preview.tenantEmail,
    tenantPhone: preview.tenantPhone,
    leaseId: preview.leaseId,
    unitId: preview.unitId,
    leaseStartDate: preview.leaseStartDate,
    leaseEndDate: preview.leaseEndDate,
    monthlyRentAmount: preview.monthlyRentAmount,
    currencyCode: preview.currencyCode,
    expiresAtIso: preview.expiresAtIso
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
  return (
    payload.users?.find((item) => item.email.toLowerCase() === normalizedEmail) ?? null
  );
}

async function upsertSupabaseUser(params: {
  supabaseAdminUrl: string;
  supabaseServiceRoleKey: string;
  email: string;
  password: string;
  phone: string | null;
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
      user_metadata: params.phone ? { phone: params.phone } : undefined
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SUPABASE_USER_UPSERT_FAILED:${response.status}:${text}`);
  }

  const payload = (await response.json()) as { id: string };
  return payload.id;
}

export interface CreateTenantInvitationRequest {
  tenantId: string;
  session: AuthSession | null;
}

export interface CreateTenantInvitationResponse {
  status: number;
  body: ApiResult<CreateTenantInvitationOutput>;
}

export interface CreateTenantInvitationDeps {
  repository: TenantLeaseRepository;
  teamFunctionsRepository: TeamPermissionRepository;
  createId: () => string;
  createToken?: () => string;
  inviteLinkBaseUrl: string;
  organizationRepository?: Pick<OrganizationPropertyUnitRepository, "getOrganizationById">;
  sendInvitationEmail?: (input: {
    to: string;
    tenantFullName: string;
    activationLink: string;
    organization?: Awaited<ReturnType<OrganizationPropertyUnitRepository["getOrganizationById"]>>;
  }) => Promise<void>;
}

export async function createTenantInvitation(
  request: CreateTenantInvitationRequest,
  deps: CreateTenantInvitationDeps
): Promise<CreateTenantInvitationResponse> {
  const sessionResult = requireOperatorSession(request.session);
  if (!sessionResult.success) {
    return { status: mapErrorCodeToHttpStatus(sessionResult.code), body: sessionResult };
  }

  const permissionResult = await requirePermission(
    sessionResult.data,
    Permission.MANAGE_TENANTS,
    deps.teamFunctionsRepository
  );
  if (!permissionResult.success) {
    return { status: mapErrorCodeToHttpStatus(permissionResult.code), body: permissionResult };
  }

  const tenant = await deps.repository.getTenantById(
    request.tenantId,
    sessionResult.data.organizationId
  );

  if (tenant === null) {
    return {
      status: 404,
      body: { success: false, code: "NOT_FOUND", error: "Tenant not found" }
    };
  }

  if (!tenant.email) {
    return {
      status: 400,
      body: { success: false, code: "VALIDATION_ERROR", error: "Tenant email is required before inviting" }
    };
  }

  if (tenant.authUserId) {
    return {
      status: 409,
      body: { success: false, code: "FORBIDDEN", error: "Tenant already has login access" }
    };
  }

  const token = deps.createToken ? deps.createToken() : randomBytes(24).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAtIso = buildExpiryIso(7);

  await deps.repository.revokeActiveTenantInvitations(tenant.id, tenant.organizationId);
  const invitation = await deps.repository.createTenantInvitation({
    id: deps.createId(),
    tenantId: tenant.id,
    organizationId: tenant.organizationId,
    email: tenant.email,
    tokenHash,
    expiresAtIso,
    createdByUserId: sessionResult.data.userId
  });

  const activationLink = buildActivationLink(deps.inviteLinkBaseUrl, token);
  const organization = deps.organizationRepository
    ? await deps.organizationRepository.getOrganizationById(sessionResult.data.organizationId)
    : null;

  if (deps.sendInvitationEmail) {
    await deps.sendInvitationEmail({
      to: invitation.email,
      tenantFullName: tenant.fullName,
      activationLink,
      organization
    });
  }

  return {
    status: 201,
    body: {
      success: true,
      data: {
        invitationId: invitation.id,
        tenantId: invitation.tenantId,
        email: invitation.email,
        expiresAtIso: invitation.expiresAtIso,
        activationLink
      }
    }
  };
}

export interface ValidateTenantInvitationRequest {
  token: string | null;
}

export interface ValidateTenantInvitationResponse {
  status: number;
  body: ApiResult<ValidateTenantInvitationOutput>;
}

export interface ValidateTenantInvitationDeps {
  repository: TenantLeaseRepository;
}

export async function validateTenantInvitation(
  request: ValidateTenantInvitationRequest,
  deps: ValidateTenantInvitationDeps
): Promise<ValidateTenantInvitationResponse> {
  const token = request.token?.trim();
  if (!token) {
    return {
      status: 400,
      body: { success: false, code: "VALIDATION_ERROR", error: "token is required" }
    };
  }

  const preview = await deps.repository.getTenantInvitationPreviewByTokenHash(hashToken(token));
  if (preview === null) {
    return {
      status: 404,
      body: { success: false, code: "NOT_FOUND", error: "Invitation not found or expired" }
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      data: {
        invitation: mapPreview(preview) as TenantInvitationPreview
      }
    }
  };
}

export interface AcceptTenantInvitationRequest {
  body: unknown;
}

export interface AcceptTenantInvitationResponse {
  status: number;
  body: ApiResult<AcceptTenantInvitationOutput>;
}

export interface AcceptTenantInvitationDeps {
  repository: TenantLeaseRepository;
  authRepository: AuthRepository;
  createMembershipId: () => string;
  supabaseAdminUrl: string;
  supabaseServiceRoleKey: string;
}

export async function acceptTenantInvitation(
  request: AcceptTenantInvitationRequest,
  deps: AcceptTenantInvitationDeps
): Promise<AcceptTenantInvitationResponse> {
  const parsed = parseAcceptTenantInvitationInput(request.body);
  if (!parsed.success) {
    return { status: mapErrorCodeToHttpStatus(parsed.code), body: parsed };
  }

  const preview = await deps.repository.getTenantInvitationPreviewByTokenHash(
    hashToken(parsed.data.token)
  );
  if (preview === null) {
    return {
      status: 404,
      body: { success: false, code: "NOT_FOUND", error: "Invitation not found or expired" }
    };
  }

  const userId = await upsertSupabaseUser({
    supabaseAdminUrl: deps.supabaseAdminUrl,
    supabaseServiceRoleKey: deps.supabaseServiceRoleKey,
    email: preview.tenantEmail,
    password: parsed.data.password,
    phone: parsed.data.phone ?? preview.tenantPhone
  });

  const existingMembership = await deps.authRepository.getMembershipByUserAndOrg(
    userId,
    preview.organizationId
  );

  if (existingMembership && existingMembership.role !== "tenant") {
    return {
      status: 409,
      body: {
        success: false,
        code: "FORBIDDEN",
        error: "User already belongs to this organization with a non-tenant role"
      }
    };
  }

  const membership =
    existingMembership ??
    (await deps.authRepository.createOrganizationMembership({
      id: deps.createMembershipId(),
      organizationId: preview.organizationId,
      userId,
      role: "tenant",
      status: "active",
      canOwnProperties: false
    }));

  const tenant = await deps.repository.linkTenantAuthUser(
    preview.tenantId,
    preview.organizationId,
    userId,
    parsed.data.phone ?? null
  );

  if (tenant === null) {
    return {
      status: 409,
      body: { success: false, code: "FORBIDDEN", error: "Tenant account already activated" }
    };
  }

  await deps.repository.markTenantInvitationUsed(preview.invitationId);

  return {
    status: 200,
    body: {
      success: true,
      data: {
        tenantId: preview.tenantId,
        userId,
        organizationId: preview.organizationId,
        membershipId: membership.id
      }
    }
  };
}