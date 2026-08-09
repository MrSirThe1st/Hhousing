"use client";

import { useAuth } from "../contexts/auth-context";

function resolveFirstName(user: ReturnType<typeof useAuth>["user"]): string {
  if (!user) {
    return "";
  }

  const metadata = user.user_metadata;
  if (metadata && typeof metadata === "object") {
    const fullName = "full_name" in metadata ? metadata.full_name : undefined;
    if (typeof fullName === "string" && fullName.trim().length > 0) {
      return fullName.trim().split(/\s+/)[0] ?? fullName.trim();
    }

    const name = "name" in metadata ? metadata.name : undefined;
    if (typeof name === "string" && name.trim().length > 0) {
      return name.trim().split(/\s+/)[0] ?? name.trim();
    }
  }

  const emailLocal = user.email?.split("@")[0];
  if (emailLocal && emailLocal.length > 0) {
    return emailLocal.charAt(0).toUpperCase() + emailLocal.slice(1);
  }

  return "";
}

export default function DashboardGreeting(): React.ReactElement {
  const { user } = useAuth();
  const firstName = resolveFirstName(user);

  return (
    <p className="text-lg font-semibold tracking-[-0.02em] text-[#010a19] dark:text-white">
      {firstName ? `Bonjour ${firstName}` : "Bonjour"}
    </p>
  );
}
