export type UserRole = "user" | "manager" | "tenant" | "owner" | "admin";

export type AuthSession = {
  userId: string;
  role: UserRole;
};
