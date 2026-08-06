"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ServiceProviderAdminListItem } from "@hhousing/data-access";
import UniversalLoadingState from "./universal-loading-state";

interface AdminServiceProviderDetailActionsProps {
  provider: ServiceProviderAdminListItem;
}

export default function AdminServiceProviderDetailActions({
  provider
}: AdminServiceProviderDetailActionsProps): React.ReactElement {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(provider.isVerified);
  const [status, setStatus] = useState(provider.status);

  async function patchVerified(next: boolean): Promise<void> {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/service-providers/${provider.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isVerified: next })
      });
      const result = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !result.success) {
        setError(result.error ?? "Échec de la mise à jour");
        return;
      }
      setIsVerified(next);
      router.refresh();
    } catch {
      setError("Erreur réseau");
    } finally {
      setPending(false);
    }
  }

  async function patchStatus(next: "active" | "suspended"): Promise<void> {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/service-providers/${provider.id}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next })
      });
      const result = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !result.success) {
        setError(result.error ?? "Échec du changement de statut");
        return;
      }
      setStatus(next);
      router.refresh();
    } catch {
      setError("Erreur réseau");
    } finally {
      setPending(false);
    }
  }

  async function onPromote(): Promise<void> {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/service-providers/${provider.id}/promote`, {
        method: "POST"
      });
      const result = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !result.success) {
        setError(result.error ?? "Échec de la promotion");
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
    <div className="space-y-4">
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
        <h3 className="text-base font-semibold text-[#010a19] dark:text-white">Statut</h3>
        <div className="mt-4 space-y-4">
          <label className="flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-600 dark:text-slate-300">Vérifié par la plateforme</span>
            <input
              type="checkbox"
              checked={isVerified}
              disabled={pending}
              onChange={(event) => void patchVerified(event.target.checked)}
            />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-600 dark:text-slate-300">
              {status === "active" ? "Actif" : "Suspendu"}
            </span>
            <input
              type="checkbox"
              checked={status === "active"}
              disabled={pending}
              onChange={(event) => void patchStatus(event.target.checked ? "active" : "suspended")}
            />
          </label>
        </div>
      </section>

      <section className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
        <Link
          href={`/admin/service-providers/${provider.id}/edit`}
          className="rounded-lg bg-[#010a19] px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-[#010a19]"
        >
          Modifier
        </Link>
        {provider.organizationId !== null ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => void onPromote()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            Promouvoir vers plateforme
          </button>
        ) : null}
        {status === "active" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => void patchStatus("suspended")}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            Suspendre
          </button>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => void patchStatus("active")}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            Réactiver
          </button>
        )}
      </section>

      {pending ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#010a19]/35 backdrop-blur-[1px]">
          <UniversalLoadingState minHeightClassName="min-h-0" className="h-full w-full" />
        </div>
      ) : null}
    </div>
  );
}
