"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminInvoiceActions({
  invoiceId,
  status
}: {
  invoiceId: string;
  status: string;
}): React.ReactElement | null {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status !== "issued") {
    return null;
  }

  async function run(action: "confirm_paid" | "void"): Promise<void> {
    if (action === "void" && !window.confirm("Annuler cette facture ?")) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/billing/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action,
          voidReason: action === "void" ? "Annulée par l'admin plateforme" : null
        })
      });
      const body = (await response.json()) as { success: boolean; error?: string };
      if (!response.ok || !body.success) {
        setError(body.error ?? "Échec");
        return;
      }
      router.refresh();
    } catch {
      setError("Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => void run("confirm_paid")}
        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
      >
        Confirmer payé
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => void run("void")}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium dark:border-slate-700"
      >
        Annuler
      </button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
