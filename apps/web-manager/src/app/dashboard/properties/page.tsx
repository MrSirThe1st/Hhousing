import { redirect } from "next/navigation";
import type { PropertyWithUnitsView } from "@hhousing/api-contracts";
import { listProperties } from "../../../api";
import { createRepositoryFromEnv } from "../../api/shared";
import { getServerAuthSession } from "../../../lib/session";

export default async function PropertiesPage(): Promise<React.ReactElement> {
  const session = await getServerAuthSession();
  if (!session) redirect("/login");

  const repoResult = createRepositoryFromEnv();
  if (!repoResult.success) {
    return (
      <div className="p-8 text-red-600">Erreur de connexion à la base de données.</div>
    );
  }

  const result = await listProperties(
    { session, organizationId: session.organizationId ?? "" },
    { repository: repoResult.data }
  );

  const items: PropertyWithUnitsView[] = result.body.success ? result.body.data.items : [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-[#010a19]">Propriétés</h1>
        <button className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white hover:bg-[#0050d0] transition-colors">
          + Ajouter
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 text-sm text-gray-400">
          Aucune propriété pour l&apos;instant.
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Nom</th>
                <th className="px-4 py-3 text-left">Adresse</th>
                <th className="px-4 py-3 text-left">Ville</th>
                <th className="px-4 py-3 text-left">Unités</th>
                <th className="px-4 py-3 text-left">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(({ property, units }) => (
                <tr key={property.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-[#010a19]">{property.name}</td>
                  <td className="px-4 py-3 text-gray-600">{property.address}</td>
                  <td className="px-4 py-3 text-gray-600">{property.city}</td>
                  <td className="px-4 py-3 text-gray-600">{units.length}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      property.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}>
                      {property.status === "active" ? "Actif" : "Archivé"}
                    </span>
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

