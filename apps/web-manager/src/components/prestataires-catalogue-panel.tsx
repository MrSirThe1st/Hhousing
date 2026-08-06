"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ServiceProviderWithCategory } from "@hhousing/api-contracts";
import PrestatairesTrustBadge from "./prestataires-trust-badge";
import CreateSuccessBanner from "./create-success-banner";
import UniversalLoadingState from "./universal-loading-state";
import {
  assignedIdsForProperty,
  type PrestatairesAssignment,
  type PrestatairesPropertyOption
} from "./prestataires-shared";

interface PrestatairesCataloguePanelProps {
  platformProviders: ServiceProviderWithCategory[];
  assignments: PrestatairesAssignment[];
  properties: PrestatairesPropertyOption[];
  writable: boolean;
  initialPropertyId?: string;
}

export default function PrestatairesCataloguePanel({
  platformProviders,
  assignments,
  properties,
  writable,
  initialPropertyId
}: PrestatairesCataloguePanelProps): React.ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [propertyId, setPropertyId] = useState(
    initialPropertyId && properties.some((p) => p.id === initialPropertyId)
      ? initialPropertyId
      : ""
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [choosingFor, setChoosingFor] = useState<string | null>(null);

  const assignedIds = useMemo(
    () => assignedIdsForProperty(assignments, propertyId),
    [assignments, propertyId]
  );

  function syncPropertyId(nextId: string): void {
    setPropertyId(nextId);
    const params = new URLSearchParams(searchParams.toString());
    if (nextId) {
      params.set("propertyId", nextId);
    } else {
      params.delete("propertyId");
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  async function assign(providerId: string, targetPropertyId: string): Promise<void> {
    setPendingId(providerId);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/prestataires/assign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ propertyId: targetPropertyId, serviceProviderId: providerId })
      });
      const result = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !result.success) {
        setError(result.error ?? "Affectation impossible");
        return;
      }
      setMessage("Prestataire ajouté au bien.");
      setChoosingFor(null);
      if (!propertyId) {
        syncPropertyId(targetPropertyId);
      }
      router.refresh();
    } catch {
      setError("Erreur réseau");
    } finally {
      setPendingId(null);
    }
  }

  function onAddClick(providerId: string): void {
    if (propertyId) {
      void assign(providerId, propertyId);
      return;
    }
    setChoosingFor(providerId);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-sm text-slate-500">
          Annuaire des prestataires vérifiés par la plateforme.
        </p>
        <label className="block text-sm sm:min-w-55">
          <span className="mb-1 block text-slate-600 dark:text-slate-300">Bien cible</span>
          <select
            value={propertyId}
            onChange={(event) => syncPropertyId(event.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-[#0d1526] dark:text-white"
          >
            <option value="">Choisir un bien…</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {message ? <CreateSuccessBanner message={message} /> : null}

      {choosingFor ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="font-medium">Choisir un bien</p>
          <p className="mt-1 text-amber-800/80 dark:text-amber-200/80">
            Sélectionnez le bien auquel affecter ce prestataire.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 dark:border-amber-700 dark:bg-[#0d1526]"
              defaultValue=""
              onChange={(event) => {
                const next = event.target.value;
                if (next) {
                  void assign(choosingFor, next);
                }
              }}
            >
              <option value="">Sélectionner…</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setChoosingFor(null)}
              className="text-sm font-medium text-amber-900 underline hover:no-underline dark:text-amber-100"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0d1526]">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900/40">
            <tr>
              <th className="px-4 py-3">Prestataire</th>
              <th className="px-4 py-3">Catégorie</th>
              <th className="px-4 py-3">Téléphone</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {platformProviders.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                  Aucun prestataire plateforme pour le moment.
                </td>
              </tr>
            ) : (
              platformProviders.map((provider) => {
                const already = Boolean(propertyId) && assignedIds.has(provider.id);
                return (
                  <tr key={provider.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#010a19] dark:text-white">{provider.name}</p>
                      <PrestatairesTrustBadge provider={provider} />
                    </td>
                    <td className="px-4 py-3">{provider.categoryName}</td>
                    <td className="px-4 py-3">{provider.phone}</td>
                    <td className="px-4 py-3 text-right">
                      {!writable ? null : already ? (
                        <span className="text-xs text-slate-400">Déjà affecté</span>
                      ) : (
                        <button
                          type="button"
                          disabled={pendingId === provider.id || properties.length === 0}
                          onClick={() => onAddClick(provider.id)}
                          className="text-xs font-medium text-[#0063fe] hover:underline disabled:opacity-60"
                        >
                          Ajouter au bien
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pendingId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#010a19]/35 backdrop-blur-[1px]">
          <UniversalLoadingState minHeightClassName="min-h-0" className="h-full w-full" />
        </div>
      ) : null}
    </div>
  );
}
