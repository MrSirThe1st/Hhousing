"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ServiceProviderWithCategory } from "@hhousing/api-contracts";
import PrestatairesAssignModal from "./prestataires-assign-modal";
import PrestatairesTrustBadge from "./prestataires-trust-badge";
import CreateSuccessBanner from "./create-success-banner";
import UniversalLoadingState from "./universal-loading-state";
import {
  assignedIdsForProperty,
  type PrestatairesAssignment,
  type PrestatairesPropertyOption
} from "./prestataires-shared";

interface PrestatairesParBienPanelProps {
  platformProviders: ServiceProviderWithCategory[];
  orgProviders: ServiceProviderWithCategory[];
  assignments: PrestatairesAssignment[];
  properties: PrestatairesPropertyOption[];
  writable: boolean;
  initialPropertyId?: string;
}

export default function PrestatairesParBienPanel({
  platformProviders,
  orgProviders,
  assignments,
  properties,
  writable,
  initialPropertyId
}: PrestatairesParBienPanelProps): React.ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const defaultPropertyId =
    (initialPropertyId && properties.some((p) => p.id === initialPropertyId)
      ? initialPropertyId
      : null) ??
    properties[0]?.id ??
    "";

  const [selectedPropertyId, setSelectedPropertyId] = useState(defaultPropertyId);
  const [assignOpen, setAssignOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialPropertyId && properties.some((p) => p.id === initialPropertyId)) {
      setSelectedPropertyId(initialPropertyId);
    }
  }, [initialPropertyId, properties]);

  function syncPropertyId(nextId: string): void {
    setSelectedPropertyId(nextId);
    const params = new URLSearchParams(searchParams.toString());
    if (nextId) {
      params.set("propertyId", nextId);
    } else {
      params.delete("propertyId");
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  const assignedIds = useMemo(
    () => assignedIdsForProperty(assignments, selectedPropertyId),
    [assignments, selectedPropertyId]
  );

  const allAssignable = useMemo(() => {
    const map = new Map<string, ServiceProviderWithCategory>();
    for (const provider of [...platformProviders, ...orgProviders]) {
      map.set(provider.id, provider);
    }
    return Array.from(map.values());
  }, [platformProviders, orgProviders]);

  const assignedProviders = allAssignable.filter((provider) => assignedIds.has(provider.id));
  const selectedProperty = properties.find((p) => p.id === selectedPropertyId);

  async function onUnassign(providerId: string): Promise<void> {
    if (!selectedPropertyId) return;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/prestataires/assign", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ propertyId: selectedPropertyId, serviceProviderId: providerId })
      });
      const result = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !result.success) {
        setError(result.error ?? "Retrait impossible");
        return;
      }
      setMessage("Prestataire retiré du bien.");
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
      {message ? <CreateSuccessBanner message={message} /> : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="block text-sm sm:min-w-55">
          <span className="mb-1 block text-slate-600 dark:text-slate-300">Bien</span>
          <select
            value={selectedPropertyId}
            onChange={(event) => syncPropertyId(event.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-[#0d1526] dark:text-white"
          >
            {properties.length === 0 ? <option value="">Aucun bien</option> : null}
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
        </label>

        {writable && selectedPropertyId ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => setAssignOpen(true)}
            className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white hover:bg-[#0052d4] disabled:opacity-60"
          >
            + Ajouter un prestataire
          </button>
        ) : null}
      </div>

      <p className="text-sm text-slate-500">
        {assignedProviders.length} prestataire{assignedProviders.length === 1 ? "" : "s"} affecté
        {assignedProviders.length === 1 ? "" : "s"}
      </p>

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
            {assignedProviders.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center">
                  <p className="text-slate-500">Aucun prestataire pour ce bien</p>
                  {writable && selectedPropertyId ? (
                    <button
                      type="button"
                      onClick={() => setAssignOpen(true)}
                      className="mt-3 text-sm font-medium text-[#0063fe] hover:underline"
                    >
                      Ajouter
                    </button>
                  ) : null}
                </td>
              </tr>
            ) : (
              assignedProviders.map((provider) => (
                <tr key={provider.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#010a19] dark:text-white">{provider.name}</p>
                    <PrestatairesTrustBadge provider={provider} />
                  </td>
                  <td className="px-4 py-3">{provider.categoryName}</td>
                  <td className="px-4 py-3">{provider.phone}</td>
                  <td className="px-4 py-3 text-right">
                    {writable ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => void onUnassign(provider.id)}
                        className="text-xs font-medium text-red-600 hover:underline disabled:opacity-60"
                      >
                        Retirer
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <PrestatairesAssignModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        propertyId={selectedPropertyId}
        propertyName={selectedProperty?.name}
        platformProviders={platformProviders}
        orgProviders={orgProviders}
        assignedIds={assignedIds}
      />

      {pending ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#010a19]/35 backdrop-blur-[1px]">
          <UniversalLoadingState minHeightClassName="min-h-0" className="h-full w-full" />
        </div>
      ) : null}
    </div>
  );
}
