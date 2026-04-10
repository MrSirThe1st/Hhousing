"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/auth-context";

export default function LogoutButton(): React.ReactElement {
  const router = useRouter();
  const { signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout(): Promise<void> {
    if (busy) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await signOut();
      router.replace("/login");
      router.refresh();
    } catch {
      setError("Deconnexion impossible.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 xl:items-end">
      <button
        type="button"
        onClick={handleLogout}
        disabled={busy}
        className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Deconnexion..." : "Se deconnecter"}
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}