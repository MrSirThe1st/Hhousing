export type UserRole = "tenant" | "manager" | "owner" | "admin";

export interface AuthSession {
  userId: string;
  role: UserRole;
  organizationId: string | null;
}
