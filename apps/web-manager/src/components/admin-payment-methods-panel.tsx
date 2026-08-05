"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PlatformPaymentMethod, PlatformPaymentProvider } from "@hhousing/domain";

const PROVIDER_OPTIONS: Array<{ value: PlatformPaymentProvider; label: string }> = [
  { value: "airtel", label: "Airtel Money" },
  { value: "orange", label: "Orange Money" },
  { value: "mpesa", label: "M-Pesa" },
  { value: "other", label: "Autre" }
];

function providerLabel(provider: PlatformPaymentProvider): string {
  return PROVIDER_OPTIONS.find((o) => o.value === provider)?.label ?? provider;
}

export default function AdminPaymentMethodsPanel({
  initialMethods
}: {
  initialMethods: PlatformPaymentMethod[];
}): React.ReactElement {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    provider: "airtel" as PlatformPaymentProvider,
    displayName: "",
    accountNumber: "",
    instructions: "",
    sortOrder: "0"
  });

  async function createMethod(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setBusyId("create");
    setError(null);
    try {
      const response = await fetch("/api/admin/billing/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          provider: form.provider,
          displayName: form.displayName,
          accountNumber: form.accountNumber,
          instructions: form.instructions || null,
          sortOrder: Number(form.sortOrder) || 0,
          isActive: true
        })
      });
      const body = (await response.json()) as { success: boolean; error?: string };
      if (!response.ok || !body.success) {
        setError(body.error ?? "Échec de la création");
        return;
      }
      setForm({ provider: "airtel", displayName: "", accountNumber: "", instructions: "", sortOrder: "0" });
      router.refresh();
    } catch {
      setError("Erreur réseau");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleActive(method: PlatformPaymentMethod): Promise<void> {
    setBusyId(method.id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/billing/payment-methods/${method.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: !method.isActive })
      });
      const body = (await response.json()) as { success: boolean; error?: string };
      if (!response.ok || !body.success) {
        setError(body.error ?? "Échec de la mise à jour");
        return;
      }
      router.refresh();
    } catch {
      setError("Erreur réseau");
    } finally {
      setBusyId(null);
    }
  }

  async function removeMethod(id: string): Promise<void> {
    if (!window.confirm("Supprimer ce moyen de paiement ?")) return;
    setBusyId(id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/billing/payment-methods/${id}`, {
        method: "DELETE",
        credentials: "include"
      });
      const body = (await response.json()) as { success: boolean; error?: string };
      if (!response.ok || !body.success) {
        setError(body.error ?? "Échec de la suppression");
        return;
      }
      router.refresh();
    } catch {
      setError("Erreur réseau");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {initialMethods.length === 0 ? (
          <li className="py-3 text-sm text-slate-500">Aucun moyen de paiement configuré.</li>
        ) : (
          initialMethods.map((method) => (
            <li key={method.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-[#010a19] dark:text-white">
                  {method.displayName}
                  {!method.isActive ? (
                    <span className="ml-2 text-xs font-normal text-slate-400">(inactif)</span>
                  ) : null}
                </p>
                <p className="text-sm text-slate-500">
                  {providerLabel(method.provider)} · {method.accountNumber}
                </p>
                {method.instructions ? (
                  <p className="mt-1 text-xs text-slate-400">{method.instructions}</p>
                ) : null}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busyId === method.id}
                  onClick={() => void toggleActive(method)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium dark:border-slate-700"
                >
                  {method.isActive ? "Désactiver" : "Activer"}
                </button>
                <button
                  type="button"
                  disabled={busyId === method.id}
                  onClick={() => void removeMethod(method.id)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 dark:border-red-900"
                >
                  Supprimer
                </button>
              </div>
            </li>
          ))
        )}
      </ul>

      <form onSubmit={createMethod} className="space-y-3 rounded-lg border border-dashed border-slate-200 p-4 dark:border-slate-700">
        <p className="text-sm font-medium text-[#010a19] dark:text-white">Ajouter un moyen de paiement</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-slate-600 dark:text-slate-300">Opérateur</span>
            <select
              value={form.provider}
              onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value as PlatformPaymentProvider }))}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
            >
              {PROVIDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-slate-600 dark:text-slate-300">Libellé</span>
            <input
              required
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              placeholder="Ex: Airtel Haraka"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600 dark:text-slate-300">Numéro</span>
            <input
              required
              value={form.accountNumber}
              onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
              placeholder="+243…"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600 dark:text-slate-300">Ordre</span>
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="text-slate-600 dark:text-slate-300">Instructions (optionnel)</span>
          <textarea
            rows={2}
            value={form.instructions}
            onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={busyId === "create"}
          className="rounded-lg bg-[#010a19] px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-[#010a19]"
        >
          {busyId === "create" ? "Ajout…" : "Ajouter"}
        </button>
      </form>
    </div>
  );
}
