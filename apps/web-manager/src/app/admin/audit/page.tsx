import { createPlatformAdminRepositoryFromEnv } from "@hhousing/data-access";

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("fr-FR");
}

export default async function AdminAuditPage(): Promise<React.ReactElement> {
  const repo = createPlatformAdminRepositoryFromEnv(process.env);
  const logs = await repo.listPlatformAuditLogs(100);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-[#010a19] dark:text-white">Audit plateforme</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Actions effectuées depuis la console admin (suspensions, réactivations…)
        </p>
      </div>

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
                  <td className="px-4 py-3 font-medium text-[#010a19] dark:text-white">{entry.actionKey}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {entry.entityType}
                    {entry.entityId ? (
                      <>
                        <br />
                        <span className="text-xs text-slate-400">{entry.entityId}</span>
                      </>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{entry.actorUserId}</td>
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
