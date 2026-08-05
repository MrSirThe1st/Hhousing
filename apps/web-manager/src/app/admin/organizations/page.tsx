import Link from "next/link";
import { createPlatformAdminRepositoryFromEnv } from "@hhousing/data-access";
import type { OrganizationPlatformStatus } from "@hhousing/data-access";

function statusLabel(status: OrganizationPlatformStatus): string {
  return status === "suspended" ? "Suspendue" : "Active";
}

function statusClass(status: OrganizationPlatformStatus): string {
  return status === "suspended"
    ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
}

export default async function AdminOrganizationsPage({
  searchParams
}: {
  searchParams: Promise<{ search?: string; status?: string }>;
}): Promise<React.ReactElement> {
  const params = await searchParams;
  const status =
    params.status === "active" || params.status === "suspended" ? params.status : null;

  const repo = createPlatformAdminRepositoryFromEnv(process.env);
  const organizations = await repo.listOrganizations({
    search: params.search ?? null,
    status,
    limit: 100
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-[#010a19] dark:text-white">Organisations</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Toutes les organisations de la plateforme
        </p>
      </div>

      <form className="flex flex-col gap-3 sm:flex-row" method="get">
        <input
          type="search"
          name="search"
          defaultValue={params.search ?? ""}
          placeholder="Rechercher par nom ou ID…"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-[#0d1526] dark:text-white"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-[#0d1526] dark:text-white"
        >
          <option value="">Tous les statuts</option>
          <option value="active">Actives</option>
          <option value="suspended">Suspendues</option>
        </select>
        <button
          type="submit"
          className="rounded-lg bg-[#010a19] px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-[#010a19]"
        >
          Filtrer
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0d1526]">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Organisation</th>
              <th className="px-4 py-3">Membres</th>
              <th className="px-4 py-3">Biens</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {organizations.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  Aucune organisation trouvée.
                </td>
              </tr>
            ) : (
              organizations.map((org) => (
                <tr key={org.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#010a19] dark:text-white">{org.name}</p>
                    <p className="text-xs text-slate-400">{org.id}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{org.memberCount}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{org.propertyCount}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md px-2 py-1 text-xs font-semibold ${statusClass(org.status)}`}>
                      {statusLabel(org.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/organizations/${org.id}`}
                      className="text-sm font-medium text-slate-700 hover:underline dark:text-slate-200"
                    >
                      Détail
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
