import { createClient } from "@supabase/supabase-js";
import type { AuthSession, UserRole } from "@hhousing/api-contracts";

const VALID_ROLES: readonly UserRole[] = ["tenant", "manager", "owner", "admin"];

type SupabaseLikeUser = {
  id: string;
  app_metadata?: unknown;
  user_metadata?: unknown;
};

type SupabaseGetUserResult = {
  data: {
    user: SupabaseLikeUser | null;
  };
  error: unknown;
};

interface SupabaseAuthLikeClient {
  auth: {
    getUser: (jwt: string) => Promise<SupabaseGetUserResult>;
  };
}

function getBearerToken(headers: Headers): string | null {
  const authorization = headers.get("authorization");
  if (!authorization) {
    return null;
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return null;
  }

  const token = match[1]?.trim();
  return token ? token : null;
}

function getMetadataValue(value: unknown, key: string): unknown {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  return (value as Record<string, unknown>)[key];
}

function asRole(value: unknown): UserRole | null {
  if (typeof value === "string" && VALID_ROLES.includes(value as UserRole)) {
    return value as UserRole;
  }

  return null;
}

function asOrganizationId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function mapUserToSession(user: SupabaseLikeUser): AuthSession {
  const roleFromApp = asRole(getMetadataValue(user.app_metadata, "role"));
  const roleFromUser = asRole(getMetadataValue(user.user_metadata, "role"));
  const organizationFromApp = asOrganizationId(getMetadataValue(user.app_metadata, "organization_id"));
  const organizationFromUser = asOrganizationId(getMetadataValue(user.user_metadata, "organization_id"));

  return {
    userId: user.id,
    role: roleFromApp ?? roleFromUser ?? "tenant",
    organizationId: organizationFromApp ?? organizationFromUser
  };
}

function createSupabaseClientFromEnv(): SupabaseAuthLikeClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!supabaseUrl || !publishableKey) {
    return null;
  }

  return createClient(supabaseUrl, publishableKey);
}

export async function extractAuthSessionFromRequest(request: Request): Promise<AuthSession | null> {
  const token = getBearerToken(request.headers);
  if (token === null) {
    return null;
  }

  const client = createSupabaseClientFromEnv();
  if (client === null) {
    return null;
  }

  const { data, error } = await client.auth.getUser(token);
  if (error || data.user === null) {
    return null;
  }

  return mapUserToSession(data.user);
}
