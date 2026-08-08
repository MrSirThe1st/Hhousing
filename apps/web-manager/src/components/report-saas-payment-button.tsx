"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PlatformSaasPaymentMethod } from "@hhousing/domain";

export default function ReportSaasPaymentButton({
  invoiceId,
  alreadyReported,
  methods
}: {
  invoiceId: string;
  alreadyReported: boolean;
  methods: Array<{ id: PlatformSaasPaymentMethod; label: string }>;
}): React.ReactElement {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(alreadyReported);
  const [method, setMethod] = useState<PlatformSaasPaymentMethod | "">(
    methods[0]?.id ?? "orange"
  );

  async function submit(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/billing/invoices/${invoiceId}/report-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          paymentMethod: method || null
        })
      });
      const body = (await response.json()) as { success: boolean; error?: string };
      if (!response.ok || !body.success) {
        setError(body.error ?? "Impossible d'enregistrer le signalement");
        return;
      }
      setDone(true);
      router.refresh();
    } catch {
      setError("Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
        Paiement signalé — Haraka vérifie et confirmera sous peu.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-slate-500">
        Méthode utilisée
        <select
          value={method}
          onChange={(event) => setMethod(event.target.value as PlatformSaasPaymentMethod)}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-[#0d1526] dark:text-white"
        >
          {methods.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
          <option value="other">Autre</option>
        </select>
      </label>
      <button
        type="button"
        disabled={busy}
        onClick={() => void submit()}
        className="rounded-lg bg-[#010a19] px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-[#010a19]"
      >
        {busy ? "Envoi…" : "J’ai effectué le paiement"}
      </button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
