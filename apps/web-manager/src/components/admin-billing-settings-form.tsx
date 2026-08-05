"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PlatformBillingSettings } from "@hhousing/domain";

export default function AdminBillingSettingsForm({
  initial
}: {
  initial: PlatformBillingSettings;
}): React.ReactElement {
  const router = useRouter();
  const [pricePerUnitAmount, setPricePerUnitAmount] = useState(String(initial.pricePerUnitAmount));
  const [freePropertyThreshold, setFreePropertyThreshold] = useState(String(initial.freePropertyThreshold));
  const [currencyCode, setCurrencyCode] = useState(initial.currencyCode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/admin/billing/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          pricePerUnitAmount: Number(pricePerUnitAmount),
          freePropertyThreshold: Number(freePropertyThreshold),
          currencyCode: currencyCode.trim().toUpperCase() || "USD"
        })
      });
      const body = (await response.json()) as { success: boolean; error?: string };
      if (!response.ok || !body.success) {
        setError(body.error ?? "Échec de la mise à jour");
        return;
      }
      setSuccess(true);
      router.refresh();
    } catch {
      setError("Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="text-slate-600 dark:text-slate-300">Prix / logement / mois</span>
          <input
            type="number"
            min={0}
            step="0.01"
            required
            value={pricePerUnitAmount}
            onChange={(e) => setPricePerUnitAmount(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600 dark:text-slate-300">Seuil gratuit (biens)</span>
          <input
            type="number"
            min={0}
            step={1}
            required
            value={freePropertyThreshold}
            onChange={(e) => setFreePropertyThreshold(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600 dark:text-slate-300">Devise</span>
          <input
            type="text"
            maxLength={3}
            required
            value={currencyCode}
            onChange={(e) => setCurrencyCode(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Gratuit si nombre de biens &lt; seuil. Sinon : logements × prix unitaire.
      </p>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-600">Paramètres enregistrés.</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-[#010a19] px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-[#010a19]"
      >
        {busy ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
