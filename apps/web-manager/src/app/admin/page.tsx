import Link from "next/link";
import { createPlatformAdminRepositoryFromEnv } from "@hhousing/data-access";
import { getPlatformAuditActionLabel } from "../../lib/admin-labels";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("fr-FR");
}

export default async function AdminOverviewPage(): Promise<React.ReactElement> {
  const repo = createPlatformAdminRepositoryFromEnv(process.env);
  const stats = await repo.getOverviewStats();

  const cards = [
    { label: "Utilisateurs", value: stats.userCount, href: "/admin/users" },
    { label: "Utilisateurs suspendus", value: stats.suspendedUserCount, href: "/admin/users?status=suspended" },
    { label: "Organisations", value: stats.organizationCount, href: "/admin/organizations" },
    {
      label: "Organisations actives",
      value: stats.activeOrganizationCount,
      href: "/admin/organizations?status=active"
    },
    {
      label: "Organisations suspendues",
      value: stats.suspendedOrganizationCount,
      href: "/admin/organizations?status=suspended"
    }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-[#010a19] dark:text-white">Vue d&apos;ensemble</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          État global de la plateforme Hhousing
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 dark:border-slate-800 dark:bg-[#0d1526] dark:hover:border-slate-700"
          >
            <p className="text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold text-[#010a19] dark:text-white">{card.value}</p>
          </Link>
        ))}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-[#010a19] dark:text-white">Activité récente</h3>
          <Link href="/admin/audit" className="text-sm font-medium text-slate-600 hover:underline dark:text-slate-300">
            Voir tout
          </Link>
        </div>
        {stats.recentPlatformAudit.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Aucune action admin enregistrée pour le moment.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {stats.recentPlatformAudit.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-[#010a19] dark:text-white">
                    {getPlatformAuditActionLabel(entry.actionKey)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {entry.entityType}
                    {entry.entityId ? ` · ${entry.entityId}` : ""}
                  </p>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(entry.createdAtIso)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
