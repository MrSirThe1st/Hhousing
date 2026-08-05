"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface AdminOrganizationStatusFormProps {
  organizationId: string;
  currentStatus: "active" | "suspended";
}

export default function AdminOrganizationStatusForm({
  organizationId,
  currentStatus
}: AdminOrganizationStatusFormProps): React.ReactElement {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextStatus = currentStatus === "suspended" ? "active" : "suspended";
  const label = nextStatus === "suspended" ? "Suspendre l'organisation" : "Réactiver l'organisation";

  async function onSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/organizations/${organizationId}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
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
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
      <h3 className="text-base font-semibold text-[#010a19] dark:text-white">Statut de l&apos;organisation</h3>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60 ${
          nextStatus === "suspended" ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
        }`}
      >
        {pending ? "En cours…" : label}
      </button>
    </form>
  );
}
