"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/auth-context";

type LogoutButtonProps = {
  compact?: boolean;
};

export default function LogoutButton({ compact = false }: LogoutButtonProps): React.ReactElement {
  const router = useRouter();
  const { signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  async function handleLogout(): Promise<void> {
    if (busy) {
      return;
    }

    setBusy(true);

    try {
      await signOut();
    } catch {
      // Ignore transient auth/session errors and continue logout navigation.
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <div className={compact ? "" : "flex flex-col items-start gap-2 xl:items-end"}>
      <button
        type="button"
        onClick={handleLogout}
        disabled={busy}
        title="Se déconnecter"
        aria-label="Se déconnecter"
        className={`inline-flex items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-100 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60 ${
          compact ? "h-9 w-9 shrink-0" : "px-4 py-2.5 text-sm"
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0" aria-hidden="true">
          <path d="M9 20.5H6.5A2.5 2.5 0 0 1 4 18V6a2.5 2.5 0 0 1 2.5-2.5H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16.5 15.5 21 12l-4.5-3.5M21 12H10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {!compact ? (busy ? "Déconnexion..." : "Se déconnecter") : null}
      </button>
    </div>
  );
}