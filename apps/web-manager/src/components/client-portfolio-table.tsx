"use client";

import { useState } from "react";
import Link from "next/link";
import type { OwnerClient, Property } from "@hhousing/domain";
import { patchWithAuth } from "../lib/api-client";

interface ClientPortfolioProperty {
  property: Property;
  unitCount: number;
  occupiedUnitCount: number;
}

interface AssignablePropertyOption {
  id: string;
  name: string;
  city: string;
  unitCount: number;
  occupiedUnitCount: number;
}

interface ClientPortfolioTableProps {
  currentClientId: string;
  ownerClients: OwnerClient[];
  properties: ClientPortfolioProperty[];
  assignableProperties: AssignablePropertyOption[];
}

export default function ClientPortfolioTable({
  currentClientId,
  ownerClients,
  properties: initialProperties,
  assignableProperties: initialAssignableProperties
}: ClientPortfolioTableProps): React.ReactElement {
  const [properties, setProperties] = useState<ClientPortfolioProperty[]>(initialProperties);
  const [assignableProperties, setAssignableProperties] = useState<AssignablePropertyOption[]>(initialAssignableProperties);
  const [selectedPropertyToAssign, setSelectedPropertyToAssign] = useState<string>("");
  const [selectedClientByPropertyId, setSelectedClientByPropertyId] = useState<Record<string, string>>(
    Object.fromEntries(initialProperties.map((item) => [item.property.id, item.property.clientId ?? currentClientId]))
  );
  const [busyPropertyId, setBusyPropertyId] = useState<string | null>(null);
  const [assignBusy, setAssignBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAssignToCurrentClient(): Promise<void> {
    if (!selectedPropertyToAssign) {
      return;
    }

    setAssignBusy(true);
    setMessage(null);
    setError(null);

    const option = assignableProperties.find((item) => item.id === selectedPropertyToAssign);
    const result = await patchWithAuth<Property>(`/api/properties/${selectedPropertyToAssign}/client`, {
      clientId: currentClientId
    });

    if (!result.success) {
      setError(result.error);
      setAssignBusy(false);
      return;
    }

    if (option) {
      setProperties((previous) => [
        ...previous,
        {
          property: result.data,
          unitCount: option.unitCount,
          occupiedUnitCount: option.occupiedUnitCount
        }
      ]);
      setSelectedClientByPropertyId((previous) => ({
        ...previous,
        [result.data.id]: currentClientId
      }));
    }

    setAssignableProperties((previous) => previous.filter((item) => item.id !== selectedPropertyToAssign));
    setSelectedPropertyToAssign("");
    setMessage("Bien affecté au client.");
    setAssignBusy(false);
  }

  async function handleReassign(propertyId: string): Promise<void> {
    setBusyPropertyId(propertyId);
    setMessage(null);
    setError(null);

    const selectedClientId = selectedClientByPropertyId[propertyId] || null;
    const result = await patchWithAuth<Property>(`/api/properties/${propertyId}/client`, {
      clientId: selectedClientId
    });

    if (!result.success) {
      setError(result.error);
      setBusyPropertyId(null);
      return;
    }

    setProperties((previous) => previous.filter((item) => item.property.id !== propertyId));
    setMessage(selectedClientId ? "Propriété réaffectée avec succès." : "Propriété retirée de ce client.");
    setBusyPropertyId(null);
  }

  return (
    <div className="space-y-4">
      {message ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-[#010a19]">Affecter un bien à ce client</p>
        <p className="mt-1 text-xs text-slate-500">Choisissez un bien géré puis appliquez l&apos;affectation.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={selectedPropertyToAssign}
            onChange={(event) => setSelectedPropertyToAssign(event.target.value)}
            className="min-w-70 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            disabled={assignableProperties.length === 0}
          >
            <option value="">Sélectionner un bien</option>
            {assignableProperties.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} - {item.city} ({item.unitCount} unité(s))
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => { void handleAssignToCurrentClient(); }}
            disabled={assignBusy || selectedPropertyToAssign.length === 0 || assignableProperties.length === 0}
            className="rounded-lg border border-[#0063fe] px-3 py-2 text-sm font-medium text-[#0063fe] hover:bg-[#0063fe]/5 disabled:opacity-60"
          >
            {assignBusy ? "Affectation..." : "Affecter"}
          </button>
        </div>
        {assignableProperties.length === 0 ? (
          <p className="mt-3 text-xs text-slate-500">Aucun bien géré disponible à affecter pour le moment.</p>
        ) : null}
      </div>

      {properties.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
          Aucun bien géré n&apos;est encore rattaché à ce client.
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Propriété</th>
                <th className="px-4 py-3">Ville</th>
                <th className="px-4 py-3">Unités</th>
                <th className="px-4 py-3">Occupées</th>
                <th className="px-4 py-3">Réaffectation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {properties.map((item) => (
                <tr key={item.property.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-[#010a19]">
                    <Link href={`/dashboard/properties/${item.property.id}`} className="transition hover:text-[#0063fe] hover:underline">
                      {item.property.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{item.property.city}</td>
                  <td className="px-4 py-3 text-gray-600">{item.unitCount}</td>
                  <td className="px-4 py-3 text-gray-600">{item.occupiedUnitCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedClientByPropertyId[item.property.id] ?? ""}
                        onChange={(event) => setSelectedClientByPropertyId((previous) => ({
                          ...previous,
                          [item.property.id]: event.target.value
                        }))}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      >
                        <option value="">Aucun client</option>
                        {ownerClients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          void handleReassign(item.property.id);
                        }}
                        disabled={busyPropertyId === item.property.id}
                        className="rounded-lg border border-[#0063fe] px-3 py-2 text-sm font-medium text-[#0063fe] hover:bg-[#0063fe]/5 disabled:opacity-60"
                      >
                        {busyPropertyId === item.property.id ? "En cours..." : "Appliquer"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}