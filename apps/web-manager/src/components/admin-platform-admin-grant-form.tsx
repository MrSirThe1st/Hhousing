"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface AdminPlatformAdminGrantFormProps {
  userId: string;
  isPlatformAdmin: boolean;
  isSelf: boolean;
}

export default function AdminPlatformAdminGrantForm({
  userId,
  isPlatformAdmin,
  isSelf
}: AdminPlatformAdminGrantFormProps): React.ReactElement {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onToggle(): Promise<void> {
    if (isPlatformAdmin && isSelf) {
      setError("Vous ne pouvez pas révoquer votre propre accès admin.");
      return;
    }

    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}/platform-admin`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ grant: !isPlatformAdmin })
      });
      const payload = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !payload.success) {
        setError(payload.error ?? "Échec de la mise à jour");
        return;
      }
      router.refresh();
    } catch {
      setError("Erreur réseau");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
      <h3 className="text-base font-semibold text-[#010a19] dark:text-white">Admin plateforme</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {isPlatformAdmin
          ? "Cet utilisateur a accès à la console /admin."
          : "Cet utilisateur n’a pas d’accès admin plateforme."}
      </p>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="button"
        disabled={pending || (isPlatformAdmin && isSelf)}
        onClick={() => void onToggle()}
        className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60 ${
          isPlatformAdmin ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
        }`}
      >
        {pending
          ? "En cours…"
          : isPlatformAdmin
            ? "Révoquer l’accès admin"
            : "Accorder l’accès admin"}
      </button>
    </div>
  );
}
