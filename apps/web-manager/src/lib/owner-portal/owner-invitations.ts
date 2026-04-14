import {
  parseAcceptOwnerInvitationInput,
  type AcceptOwnerInvitationOutput,
  type ApiResult,
  type OwnerInvitationPreview,
  type ValidateOwnerInvitationOutput
} from "@hhousing/api-contracts";
import type { OwnerPortalAccessRepository } from "@hhousing/data-access";
import { createHash } from "crypto";
import type { CurrentAuthenticatedUser } from "./current-user";

type SupabaseAdminUser = {
  id: string;
  email: string;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function mapPreview(
  preview: Awaited<ReturnType<OwnerPortalAccessRepository["getOwnerInvitationPreviewByTokenHash"]>>,
  accountExists: boolean
): OwnerInvitationPreview | null {
  if (preview === null) {
    return null;
  }

  return {
    invitationId: preview.invitationId,
    ownerId: preview.ownerId,
    organizationId: preview.organizationId,
    ownerName: preview.ownerName,
    organizationName: preview.organizationName,
    email: preview.email,
    expiresAtIso: preview.expiresAtIso,
    accountExists
  };
}

async function listSupabaseUsers(
  supabaseAdminUrl: string,
  supabaseServiceRoleKey: string
): Promise<SupabaseAdminUser[]> {
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
  return payload.users ?? [];
}

async function findSupabaseUserByEmail(
  supabaseAdminUrl: string,
  supabaseServiceRoleKey: string,
  email: string
): Promise<SupabaseAdminUser | null> {
  const normalizedEmail = normalizeEmail(email);
  const users = await listSupabaseUsers(supabaseAdminUrl, supabaseServiceRoleKey);
  return users.find((user) => normalizeEmail(user.email) === normalizedEmail) ?? null;
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
      user_metadata: {
        full_name: params.fullName
      }
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SUPABASE_USER_UPSERT_FAILED:${response.status}:${text}`);
  }

  const payload = (await response.json()) as { id: string };
  return payload.id;
}

export interface ValidateOwnerInvitationRequest {
  token: string | null;
}

export interface ValidateOwnerInvitationDeps {
  repository: OwnerPortalAccessRepository;
  supabaseAdminUrl: string | undefined;
  supabaseServiceRoleKey: string | undefined;
}

export interface ValidateOwnerInvitationResponse {
  status: number;
  body: ApiResult<ValidateOwnerInvitationOutput>;
}

export async function validateOwnerInvitation(
  request: ValidateOwnerInvitationRequest,
  deps: ValidateOwnerInvitationDeps
): Promise<ValidateOwnerInvitationResponse> {
  const token = request.token?.trim();
  if (!token) {
    return {
      status: 400,
      body: { success: false, code: "VALIDATION_ERROR", error: "token is required" }
    };
  }

  if (!deps.supabaseAdminUrl || !deps.supabaseServiceRoleKey) {
    return {
      status: 500,
      body: {
        success: false,
        code: "INTERNAL_ERROR",
        error: "Supabase admin configuration missing"
      }
    };
  }

  const previewRecord = await deps.repository.getOwnerInvitationPreviewByTokenHash(hashToken(token));
  if (previewRecord === null) {
    return {
      status: 404,
      body: { success: false, code: "NOT_FOUND", error: "Invitation introuvable." }
    };
  }

  const accountExists =
    (await findSupabaseUserByEmail(
      deps.supabaseAdminUrl,
      deps.supabaseServiceRoleKey,
      previewRecord.email
    )) !== null;

  const preview = mapPreview(previewRecord, accountExists);
  if (preview === null) {
    return {
      status: 404,
      body: { success: false, code: "NOT_FOUND", error: "Invitation introuvable." }
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      data: {
        invitation: preview
      }
    }
  };
}

export interface AcceptOwnerInvitationRequest {
  body: unknown;
  currentUser: CurrentAuthenticatedUser | null;
}

export interface AcceptOwnerInvitationDeps {
  repository: OwnerPortalAccessRepository;
  createId: () => string;
  supabaseAdminUrl: string | undefined;
  supabaseServiceRoleKey: string | undefined;
}

export interface AcceptOwnerInvitationResponse {
  status: number;
  body: ApiResult<AcceptOwnerInvitationOutput>;
}

export async function acceptOwnerInvitation(
  request: AcceptOwnerInvitationRequest,
  deps: AcceptOwnerInvitationDeps
): Promise<AcceptOwnerInvitationResponse> {
  const parsed = parseAcceptOwnerInvitationInput(request.body);
  if (!parsed.success) {
    return {
      status: 400,
      body: parsed
    };
  }

  if (!deps.supabaseAdminUrl || !deps.supabaseServiceRoleKey) {
    return {
      status: 500,
      body: {
        success: false,
        code: "INTERNAL_ERROR",
        error: "Supabase admin configuration missing"
      }
    };
  }

  const preview = await deps.repository.getOwnerInvitationPreviewByTokenHash(
    hashToken(parsed.data.token)
  );

  if (preview === null) {
    return {
      status: 404,
      body: { success: false, code: "NOT_FOUND", error: "Invitation introuvable." }
    };
  }

  const invitedEmail = normalizeEmail(preview.email);
  const existingUser = await findSupabaseUserByEmail(
    deps.supabaseAdminUrl,
    deps.supabaseServiceRoleKey,
    preview.email
  );

  let userId: string;
  if (parsed.data.password !== undefined && parsed.data.fullName !== undefined) {
    if (existingUser !== null) {
      return {
        status: 409,
        body: {
          success: false,
          code: "CONFLICT",
          error: "Un compte existe deja pour cet email. Connectez-vous pour accepter l'invitation."
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
  } else {
    if (request.currentUser === null) {
      return {
        status: 401,
        body: {
          success: false,
          code: "UNAUTHORIZED",
          error: "Connectez-vous avec l'email invite pour accepter cette invitation."
        }
      };
    }

    if (request.currentUser.email === null || normalizeEmail(request.currentUser.email) !== invitedEmail) {
      return {
        status: 403,
        body: {
          success: false,
          code: "FORBIDDEN",
          error: "Le compte connecte ne correspond pas a l'email invite."
        }
      };
    }

    userId = request.currentUser.id;
  }

  const existingAccess = await deps.repository.getOwnerPortalAccessByUserAndOwner(
    userId,
    preview.ownerId,
    preview.organizationId
  );

  const access =
    existingAccess ??
    (await deps.repository.createOwnerPortalAccess({
      id: deps.createId(),
      ownerId: preview.ownerId,
      organizationId: preview.organizationId,
      userId,
      email: preview.email,
      invitedByUserId: null
    }));

  await deps.repository.markOwnerInvitationUsed(preview.invitationId);

  return {
    status: 200,
    body: {
      success: true,
      data: {
        userId,
        ownerId: access.ownerId,
        organizationId: access.organizationId,
        accessId: access.id
      }
    }
  };
}
