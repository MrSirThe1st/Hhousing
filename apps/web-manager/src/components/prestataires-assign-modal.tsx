"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ServiceProviderWithCategory } from "@hhousing/api-contracts";
import PrestatairesTrustBadge from "./prestataires-trust-badge";
import UniversalLoadingState from "./universal-loading-state";

type AssignTab = "catalogue" | "mine";

interface PrestatairesAssignModalProps {
  open: boolean;
  onClose: () => void;
  propertyId: string;
  propertyName?: string;
  platformProviders: ServiceProviderWithCategory[];
  orgProviders: ServiceProviderWithCategory[];
  assignedIds: Set<string>;
}

export default function PrestatairesAssignModal({
  open,
  onClose,
  propertyId,
  propertyName,
  platformProviders,
  orgProviders,
  assignedIds
}: PrestatairesAssignModalProps): React.ReactElement | null {
  const router = useRouter();
  const [tab, setTab] = useState<AssignTab>("catalogue");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useMemo(
    () => (tab === "catalogue" ? platformProviders : orgProviders),
    [tab, platformProviders, orgProviders]
  );

  if (!open) {
    return null;
  }

  async function onConfirm(): Promise<void> {
    if (!selectedId || !propertyId) {
      setError("Sélectionnez un prestataire");
      return;
    }
    if (assignedIds.has(selectedId)) {
      setError("Ce prestataire est déjà affecté à ce bien");
      return;
    }

    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/prestataires/assign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ propertyId, serviceProviderId: selectedId })
      });
      const result = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !result.success) {
        setError(result.error ?? "Affectation impossible");
        return;
      }
      setSelectedId(null);
      onClose();
      router.refresh();
    } catch {
      setError("Erreur réseau");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Ajouter un prestataire"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-[#0d1526]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-[#010a19] dark:text-white">
              Ajouter un prestataire
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {propertyName ? `Bien : ${propertyName}` : "Choisir dans le catalogue ou vos prestataires"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            aria-label="Fermer"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex gap-1 border-b border-slate-200 px-5 dark:border-slate-800">
          {(
            [
              { id: "catalogue" as const, label: "Catalogue" },
              { id: "mine" as const, label: "Mes prestataires" }
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id);
                setSelectedId(null);
                setError(null);
              }}
              className={`border-b-2 px-3 py-2.5 text-sm font-medium ${
                tab === item.id
                  ? "border-[#0063fe] text-[#0063fe]"
                  : "border-transparent text-slate-500 hover:text-[#010a19] dark:hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error ? (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {list.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              {tab === "catalogue"
                ? "Aucun prestataire plateforme pour le moment."
                : "Aucun prestataire privé. Créez-en un depuis Mes prestataires."}
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {list.map((provider) => {
                const already = assignedIds.has(provider.id);
                const selected = selectedId === provider.id;
                return (
                  <li key={provider.id}>
                    <button
                      type="button"
                      disabled={already || pending}
                      onClick={() => setSelectedId(provider.id)}
                      className={`flex w-full items-start justify-between gap-3 px-2 py-3 text-left transition ${
                        already
                          ? "cursor-not-allowed opacity-50"
                          : selected
                            ? "bg-[#0063fe]/8"
                            : "hover:bg-slate-50 dark:hover:bg-slate-900/40"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-[#010a19] dark:text-white">{provider.name}</p>
                        <PrestatairesTrustBadge provider={provider} />
                        <p className="mt-1 text-xs text-slate-500">
                          {provider.categoryName} · {provider.phone}
                        </p>
                      </div>
                      {already ? (
                        <span className="shrink-0 text-xs text-slate-400">Déjà affecté</span>
                      ) : selected ? (
                        <span className="shrink-0 text-xs font-medium text-[#0063fe]">Sélectionné</span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={pending || !selectedId}
            className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white hover:bg-[#0052d4] disabled:opacity-60"
          >
            Confirmer
          </button>
        </div>
      </div>

      {pending ? (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-[#010a19]/35 backdrop-blur-[1px]">
          <UniversalLoadingState minHeightClassName="min-h-0" className="h-full w-full" />
        </div>
      ) : null}
    </div>
  );
}
