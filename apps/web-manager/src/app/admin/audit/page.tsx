import Link from "next/link";
import { createPlatformAdminRepositoryFromEnv } from "@hhousing/data-access";
import {
  getPlatformAuditActionLabel,
  getPlatformEntityTypeLabel
} from "../../../lib/admin-labels";

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("fr-FR");
}

export default async function AdminAuditPage({
  searchParams
}: {
  searchParams: Promise<{ actionKey?: string; entityType?: string }>;
}): Promise<React.ReactElement> {
  const params = await searchParams;
  const repo = createPlatformAdminRepositoryFromEnv(process.env);
  const logs = await repo.listPlatformAuditLogs({
    limit: 100,
    actionKey: params.actionKey ?? null,
    entityType: params.entityType ?? null
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-[#010a19] dark:text-white">Audit plateforme</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Journal de contrôle SaaS (suspensions, grants). Support client via Tawk.to. Usage produit via PostHog.
        </p>
      </div>

      <form className="flex flex-col gap-3 sm:flex-row" method="get">
        <select
          name="entityType"
          defaultValue={params.entityType ?? ""}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-[#0d1526] dark:text-white"
        >
          <option value="">Toutes les entités</option>
          <option value="user">Utilisateur</option>
          <option value="organization">Organisation</option>
          <option value="platform_admin">Admin plateforme</option>
        </select>
        <select
          name="actionKey"
          defaultValue={params.actionKey ?? ""}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-[#0d1526] dark:text-white"
        >
          <option value="">Toutes les actions</option>
          <option value="user.suspend">Utilisateur suspendu</option>
          <option value="user.activate">Utilisateur réactivé</option>
          <option value="organization.suspend">Organisation suspendue</option>
          <option value="organization.activate">Organisation réactivée</option>
          <option value="platform_admin.grant">Admin accordé</option>
          <option value="platform_admin.revoke">Admin révoqué</option>
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
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entité</th>
              <th className="px-4 py-3">Acteur</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  Aucun événement d&apos;audit plateforme.
                </td>
              </tr>
            ) : (
              logs.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-4 py-3 font-medium text-[#010a19] dark:text-white">
                    {getPlatformAuditActionLabel(entry.actionKey)}
                    <br />
                    <span className="text-xs font-normal text-slate-400">{entry.actionKey}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {getPlatformEntityTypeLabel(entry.entityType)}
                    {entry.entityId ? (
                      <>
                        <br />
                        {entry.entityType === "user" || entry.entityType === "platform_admin" ? (
                          <Link href={`/admin/users/${entry.entityId}`} className="text-xs text-slate-400 hover:underline">
                            {entry.entityId}
                          </Link>
                        ) : entry.entityType === "organization" ? (
                          <Link href={`/admin/organizations/${entry.entityId}`} className="text-xs text-slate-400 hover:underline">
                            {entry.entityId}
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-400">{entry.entityId}</span>
                        )}
                      </>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    <Link href={`/admin/users/${entry.actorUserId}`} className="hover:underline">
                      {entry.actorUserId}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDate(entry.createdAtIso)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
