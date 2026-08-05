"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ReportSaasPaymentButton({
  invoiceId,
  disabled
}: {
  invoiceId: string;
  disabled?: boolean;
}): React.ReactElement {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ invoiceId, paymentNote: note.trim() || null })
      });
      const body = (await response.json()) as { success: boolean; error?: string };
      if (!response.ok || !body.success) {
        setError(body.error ?? "Échec du signalement");
        return;
      }
      setNote("");
      router.refresh();
    } catch {
      setError("Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 space-y-2">
      <label className="block text-sm">
        <span className="text-slate-600 dark:text-slate-300">Note (référence Mobile Money, optionnel)</span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={disabled || busy}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
          placeholder="Ex: Airtel · 14h32"
        />
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={disabled || busy}
        className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {busy ? "Envoi…" : "J'ai payé — signaler le paiement"}
      </button>
    </form>
  );
}
