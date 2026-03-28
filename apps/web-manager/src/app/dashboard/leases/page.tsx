import { redirect } from "next/navigation";
import type { LeaseWithTenantView } from "@hhousing/api-contracts";
import { listLeases } from "../../../api";
import { createTenantLeaseRepo } from "../../api/shared";
import { getServerAuthSession } from "../../../lib/session";

const STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  ended: "Terminé",
  pending: "En attente",
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  ended: "bg-gray-100 text-gray-500",
  pending: "bg-yellow-100 text-yellow-700",
};

export default async function LeasesPage(): Promise<React.ReactElement> {
  const session = await getServerAuthSession();
  if (!session) redirect("/login");

  const result = await listLeases(
    { session, organizationId: session.organizationId ?? "" },
    { repository: createTenantLeaseRepo() }
  );

  const leases: LeaseWithTenantView[] = result.body.success ? result.body.data.leases : [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-[#010a19]">Baux</h1>
        <button className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white hover:bg-[#0050d0] transition-colors">
          + Nouveau bail
        </button>
      </div>

      {leases.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 text-sm text-gray-400">
          Aucun bail pour l&apos;instant.
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Locataire</th>
                <th className="px-4 py-3 text-left">Début</th>
                <th className="px-4 py-3 text-left">Fin</th>
                <th className="px-4 py-3 text-left">Loyer</th>
                <th className="px-4 py-3 text-left">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leases.map((lease) => (
                <tr key={lease.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-[#010a19]">{lease.tenantFullName}</td>
                  <td className="px-4 py-3 text-gray-600">{lease.startDate}</td>
                  <td className="px-4 py-3 text-gray-600">{lease.endDate ?? "Ouvert"}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {lease.monthlyRentAmount.toLocaleString("fr-FR")} {lease.currencyCode}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[lease.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {STATUS_LABELS[lease.status] ?? lease.status}
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

