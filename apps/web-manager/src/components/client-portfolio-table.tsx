"use client";

import Link from "next/link";
import type { Property } from "@hhousing/domain";

interface ClientPortfolioProperty {
  property: Property;
  unitCount: number;
  occupiedUnitCount: number;
}

interface ClientPortfolioTableProps {
  currentClientId: string;
  properties: ClientPortfolioProperty[];
}

export default function ClientPortfolioTable({
  currentClientId,
  properties
}: ClientPortfolioTableProps): React.ReactElement {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link
          href={`/dashboard/clients/${currentClientId}/assign`}
          className="rounded-lg border border-[#0063fe] px-3 py-2 text-sm font-medium text-[#0063fe] hover:bg-[#0063fe]/5"
        >
          Gerer les affectations
        </Link>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}