import { createClient } from "@supabase/supabase-js";
import type { AuthSession, UserRole } from "@hhousing/api-contracts";
import { readSupabasePublicEnv } from "../config/supabase-env";

const VALID_ROLES: readonly UserRole[] = ["user", "manager", "tenant", "owner", "admin"];

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

export interface SupabaseAuthLikeClient {
  auth: {
    getUser: (jwt: string) => Promise<SupabaseGetUserResult>;
  };
}

export interface ExtractAuthSessionDeps {
  getClient: () => SupabaseAuthLikeClient | null;
}

function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && (VALID_ROLES as readonly string[]).includes(value);
}

function getRoleFromMetadata(value: unknown): unknown {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  return (value as { role?: unknown }).role;
}

function getBearerToken(headers: Headers): string | null {
  const authorization = headers.get("authorization");
  if (typeof authorization !== "string") {
    return null;
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return null;
  }

  const token = match[1]?.trim();
  return token && token.length > 0 ? token : null;
}

function mapUserToSession(user: SupabaseLikeUser): AuthSession {
  const roleFromAppMetadata = getRoleFromMetadata(user.app_metadata);
  const roleFromUserMetadata = getRoleFromMetadata(user.user_metadata);
  const role = isUserRole(roleFromAppMetadata)
    ? roleFromAppMetadata
    : isUserRole(roleFromUserMetadata)
      ? roleFromUserMetadata
      : "user";

  return {
    userId: user.id,
    role
  };
}

function defaultGetClient(): SupabaseAuthLikeClient | null {
  const envResult = readSupabasePublicEnv(process.env);
  if (!envResult.success) {
    return null;
  }

  return createClient(
    envResult.data.supabaseUrl,
    envResult.data.supabasePublishableKey
  );
}

export async function extractAuthSessionFromRequest(
  request: Request,
  deps?: Partial<ExtractAuthSessionDeps>
): Promise<AuthSession | null> {
  const token = getBearerToken(request.headers);
  if (token === null) {
    return null;
  }

  const getClient = deps?.getClient ?? defaultGetClient;
  const client = getClient();
  if (client === null) {
    return null;
  }

  const { data, error } = await client.auth.getUser(token);
  if (error || data.user === null) {
    return null;
  }

  return mapUserToSession(data.user);
}
