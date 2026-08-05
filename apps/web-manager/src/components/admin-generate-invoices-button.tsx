"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminGenerateInvoicesButton(): React.ReactElement {
  const router = useRouter();
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return `${now.getUTCFullYear()}-${`${now.getUTCMonth() + 1}`.padStart(2, "0")}`;
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onGenerate(): Promise<void> {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/billing/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ period })
      });
      const body = (await response.json()) as {
        success: boolean;
        error?: string;
        data?: {
          created: number;
          skippedFree: number;
          skippedExisting: number;
          failures: unknown[];
        };
      };
      if (!response.ok || !body.success || !body.data) {
        setError(body.error ?? "Échec de la génération");
        return;
      }
      setMessage(
        `${body.data.created} créée(s), ${body.data.skippedFree} gratuite(s) ignorée(s), ${body.data.skippedExisting} déjà existante(s), ${body.data.failures.length} échec(s).`
      );
      router.refresh();
    } catch {
      setError("Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="block text-sm">
        <span className="text-slate-600 dark:text-slate-300">Période (YYYY-MM)</span>
        <input
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          pattern="\d{4}-\d{2}"
          className="mt-1 block w-40 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
        />
      </label>
      <button
        type="button"
        disabled={busy}
        onClick={() => void onGenerate()}
        className="rounded-lg bg-[#010a19] px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-[#010a19]"
      >
        {busy ? "Génération…" : "Générer les factures"}
      </button>
      {message ? <p className="text-sm text-emerald-600 sm:self-center">{message}</p> : null}
      {error ? <p className="text-sm text-red-600 sm:self-center">{error}</p> : null}
    </div>
  );
}
