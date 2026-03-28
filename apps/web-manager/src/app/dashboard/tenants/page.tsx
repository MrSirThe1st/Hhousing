import { redirect } from "next/navigation";
import type { Tenant } from "@hhousing/domain";
import { listTenants } from "../../../api";
import { createTenantLeaseRepo } from "../../api/shared";
import { getServerAuthSession } from "../../../lib/session";

export default async function TenantsPage(): Promise<React.ReactElement> {
  const session = await getServerAuthSession();
  if (!session) redirect("/login");

  const result = await listTenants(
    { session, organizationId: session.organizationId ?? "" },
    { repository: createTenantLeaseRepo() }
  );

  const tenants: Tenant[] = result.body.success ? result.body.data.tenants : [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-[#010a19]">Locataires</h1>
        <button className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white hover:bg-[#0050d0] transition-colors">
          + Ajouter
        </button>
      </div>

      {tenants.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 text-sm text-gray-400">
          Aucun locataire pour l&apos;instant.
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Nom</th>
                <th className="px-4 py-3 text-left">E-mail</th>
                <th className="px-4 py-3 text-left">Téléphone</th>
                <th className="px-4 py-3 text-left">Ajouté le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-[#010a19]">{tenant.fullName}</td>
                  <td className="px-4 py-3 text-gray-600">{tenant.email ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{tenant.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(tenant.createdAtIso).toLocaleDateString("fr-FR")}
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

