import Link from "next/link";
import { notFound } from "next/navigation";
import { createPlatformAdminRepositoryFromEnv } from "@hhousing/data-access";
import AdminUserStatusForm from "../../../../components/admin-user-status-form";

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("fr-FR");
}

export default async function AdminUserDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;
  const repo = createPlatformAdminRepositoryFromEnv(process.env);
  const user = await repo.getUserDetail(id);

  if (user === null) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/users" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          ← Utilisateurs
        </Link>
        <h2 className="mt-2 text-2xl font-semibold text-[#010a19] dark:text-white">
          {user.email ?? "Utilisateur"}
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{user.userId}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span
            className={`rounded-md px-2 py-1 text-xs font-semibold ${
              user.accountStatus === "suspended"
                ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
            }`}
          >
            {user.accountStatus === "suspended" ? "Suspendu" : "Actif"}
          </span>
          {user.isPlatformAdmin ? (
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              platform_admin
            </span>
          ) : null}
        </div>
      </div>

      <AdminUserStatusForm
        userId={user.userId}
        currentStatus={user.accountStatus}
        reason={user.accountReason}
      />

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
        <h3 className="text-base font-semibold text-[#010a19] dark:text-white">Appartenances</h3>
        {user.memberships.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Aucune appartenance organisationnelle.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {user.memberships.map((membership) => (
              <li key={membership.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Link
                    href={`/admin/organizations/${membership.organizationId}`}
                    className="font-medium text-[#010a19] hover:underline dark:text-white"
                  >
                    {membership.organizationName}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {membership.role} · {membership.status} · org {membership.organizationStatus}
                  </p>
                </div>
                <p className="text-xs text-slate-400">{formatDate(membership.createdAtIso)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
        <h3 className="text-base font-semibold text-[#010a19] dark:text-white">Accès portail propriétaire</h3>
        {user.ownerPortalAccesses.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Aucun accès owner portal.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {user.ownerPortalAccesses.map((access) => (
              <li key={access.id} className="py-3 text-sm">
                <p className="font-medium text-[#010a19] dark:text-white">{access.email}</p>
                <p className="text-xs text-slate-500">
                  org {access.organizationId} · owner {access.ownerId} · {access.status}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
