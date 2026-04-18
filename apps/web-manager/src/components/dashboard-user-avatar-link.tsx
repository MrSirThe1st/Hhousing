"use client";

import Link from "next/link";
import { useAuth } from "../contexts/auth-context";

function resolveDisplayName(user: ReturnType<typeof useAuth>["user"]): string {
  if (!user) {
    return "Profil";
  }

  const metadata = user.user_metadata;
  if (metadata && typeof metadata === "object") {
    const fullName = "full_name" in metadata ? metadata.full_name : undefined;
    if (typeof fullName === "string" && fullName.trim().length > 0) {
      return fullName.trim();
    }

    const name = "name" in metadata ? metadata.name : undefined;
    if (typeof name === "string" && name.trim().length > 0) {
      return name.trim();
    }
  }

  return user.email?.split("@")[0] ?? "Profil";
}

function initialsFromName(value: string): string {
  const parts = value
    .split(" ")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 2);

  if (parts.length === 0) {
    return "OP";
  }

  return parts.map((item) => item[0]?.toUpperCase() ?? "").join("");
}

export default function DashboardUserAvatarLink(): React.ReactElement {
  const { user } = useAuth();
  const displayName = resolveDisplayName(user);
  const avatarUrl = (() => {
    if (!user?.user_metadata || typeof user.user_metadata !== "object") {
      return null;
    }
    const avatar = "avatar_url" in user.user_metadata ? user.user_metadata.avatar_url : undefined;
    return typeof avatar === "string" && avatar.trim().length > 0 ? avatar : null;
  })();

  return (
    <Link
      href="/dashboard/profile"
      className="inline-flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 transition hover:border-slate-300 hover:bg-slate-50"
      aria-label="Ouvrir mon profil"
      title="Mon profil"
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={displayName}
          className="h-9 w-9 rounded-full border border-slate-200 object-cover"
        />
      ) : (
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0063fe] text-xs font-semibold uppercase text-white">
          {initialsFromName(displayName)}
        </span>
      )}
      <span className="hidden text-sm font-medium text-slate-700 sm:block">{displayName}</span>
    </Link>
  );
}
