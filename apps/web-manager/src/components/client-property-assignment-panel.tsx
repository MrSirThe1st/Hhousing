"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Property } from "@hhousing/domain";
import { patchWithAuth } from "../lib/api-client";

interface AssignablePropertyOption {
  id: string;
  name: string;
  city: string;
  unitCount: number;
}

interface ClientPropertyAssignmentPanelProps {
  clientId: string;
  assignableProperties: AssignablePropertyOption[];
}

export default function ClientPropertyAssignmentPanel({
  clientId,
  assignableProperties
}: ClientPropertyAssignmentPanelProps): React.ReactElement {
  const router = useRouter();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAssign(): Promise<void> {
    if (!selectedPropertyId) {
      return;
    }

    setBusy(true);
    setError(null);

    const result = await patchWithAuth<Property>(`/api/properties/${selectedPropertyId}/client`, {
      clientId
    });

    if (!result.success) {
      setError(result.error);
      setBusy(false);
      return;
    }

    setSelectedPropertyId("");
    router.refresh();
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#010a19]">Affecter un bien à ce client</h2>
          <p className="mt-1 text-sm text-slate-500">
            Rattachez directement un bien géré à cette fiche client.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedPropertyId}
            onChange={(event) => setSelectedPropertyId(event.target.value)}
            className="min-w-70 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            disabled={assignableProperties.length === 0 || busy}
          >
            <option value="">Sélectionner un bien géré</option>
            {assignableProperties.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} - {item.city} ({item.unitCount} unité(s))
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => { void handleAssign(); }}
            disabled={busy || selectedPropertyId.length === 0 || assignableProperties.length === 0}
            className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0052d4] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Affectation..." : "Affecter"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {assignableProperties.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
          Aucun bien disponible à affecter pour le moment.
          <Link href="/dashboard/properties" className="ml-1 font-medium text-[#0063fe] hover:underline">
            Ouvrir les propriétés
          </Link>
        </div>
      ) : null}
    </section>
  );
}