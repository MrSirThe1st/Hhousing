"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Property } from "@hhousing/domain";
import { patchWithAuth } from "../lib/api-client";

type PropertyAssignmentItem = {
  id: string;
  name: string;
  city: string;
  unitCount: number;
  occupiedUnitCount: number;
};

interface ClientAssignmentWorkspaceProps {
  clientId: string;
  assignableProperties: PropertyAssignmentItem[];
  assignedProperties: PropertyAssignmentItem[];
}

export default function ClientAssignmentWorkspace({
  clientId,
  assignableProperties,
  assignedProperties
}: ClientAssignmentWorkspaceProps): React.ReactElement {
  const router = useRouter();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [busyPropertyId, setBusyPropertyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAssign(propertyId: string): Promise<void> {
    setBusyPropertyId(propertyId);
    setMessage(null);
    setError(null);

    const result = await patchWithAuth<Property>(`/api/properties/${propertyId}/client`, {
      clientId
    });

    if (!result.success) {
      setError(result.error);
      setBusyPropertyId(null);
      return;
    }

    setMessage("Bien affecte au proprietaire.");
    setSelectedPropertyId("");
    setBusyPropertyId(null);
    router.refresh();
  }

  async function handleUnassign(propertyId: string): Promise<void> {
    setBusyPropertyId(propertyId);
    setMessage(null);
    setError(null);

    const result = await patchWithAuth<Property>(`/api/properties/${propertyId}/client`, {
      clientId: null
    });

    if (!result.success) {
      setError(result.error);
      setBusyPropertyId(null);
      return;
    }

    setMessage("Bien retire du proprietaire.");
    setBusyPropertyId(null);
    router.refresh();
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

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#010a19]">Affecter un bien a ce client</h2>
        {assignableProperties.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">Aucun bien disponible a affecter.</p>
        ) : (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="block min-w-[320px] flex-1 text-sm text-gray-600">
              <span className="mb-1.5 block font-medium text-gray-700">Bien a affecter</span>
              <select
                value={selectedPropertyId}
                onChange={(event) => setSelectedPropertyId(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                disabled={busyPropertyId !== null}
              >
                <option value="">Selectionner un bien</option>
                {assignableProperties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name} - {property.city} ({property.unitCount} unites)
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => {
                if (selectedPropertyId.length > 0) {
                  void handleAssign(selectedPropertyId);
                }
              }}
              disabled={selectedPropertyId.length === 0 || busyPropertyId !== null}
              className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white hover:bg-[#0050d0] disabled:opacity-60"
            >
              {busyPropertyId !== null ? "Affectation..." : "Affecter"}
            </button>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#010a19]">Biens deja rattaches</h2>
        <p className="mt-1 text-sm text-gray-500">
          Retirez un bien si vous devez le repasser dans le portefeuille organisation.
        </p>

        {assignedProperties.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">Ce proprietaire n&apos;a encore aucun bien rattache.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Bien</th>
                  <th className="px-4 py-3">Ville</th>
                  <th className="px-4 py-3">Unites</th>
                  <th className="px-4 py-3">Occupees</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {assignedProperties.map((property) => (
                  <tr key={property.id}>
                    <td className="px-4 py-3 font-medium text-[#010a19]">{property.name}</td>
                    <td className="px-4 py-3 text-gray-600">{property.city}</td>
                    <td className="px-4 py-3 text-gray-600">{property.unitCount}</td>
                    <td className="px-4 py-3 text-gray-600">{property.occupiedUnitCount}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          void handleUnassign(property.id);
                        }}
                        disabled={busyPropertyId === property.id}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                      >
                        {busyPropertyId === property.id ? "Retrait..." : "Retirer"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
