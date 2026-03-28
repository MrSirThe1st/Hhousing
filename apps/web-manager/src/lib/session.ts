import type { AuthSession, UserRole } from "@hhousing/api-contracts";
import { createSupabaseServerClient } from "./supabase/server";

const VALID_ROLES: readonly UserRole[] = ["tenant", "manager", "owner", "admin"];

function getMetadataValue(value: unknown, key: string): unknown {
  if (typeof value !== "object" || value === null) return undefined;
  return (value as Record<string, unknown>)[key];
}

function asRole(value: unknown): UserRole | null {
  if (typeof value === "string" && VALID_ROLES.includes(value as UserRole)) {
    return value as UserRole;
  }
  return null;
}

function asOrganizationId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export async function getServerAuthSession(): Promise<AuthSession | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || user === null) return null;

  const roleFromApp = asRole(getMetadataValue(user.app_metadata, "role"));
  const roleFromUser = asRole(getMetadataValue(user.user_metadata, "role"));
  const orgFromApp = asOrganizationId(getMetadataValue(user.app_metadata, "organization_id"));
  const orgFromUser = asOrganizationId(getMetadataValue(user.user_metadata, "organization_id"));

  return {
    userId: user.id,
    role: roleFromApp ?? roleFromUser ?? "tenant",
    organizationId: orgFromApp ?? orgFromUser,
  };
}
