import Link from "next/link";
import { notFound } from "next/navigation";
import { createPlatformAdminRepositoryFromEnv } from "@hhousing/data-access";
import AdminOrganizationStatusForm from "../../../../components/admin-organization-status-form";
import { getPlatformAuditActionLabel } from "../../../../lib/admin-labels";

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("fr-FR");
}

export default async function AdminOrganizationDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;
  const repo = createPlatformAdminRepositoryFromEnv(process.env);
  const organization = await repo.getOrganizationDetail(id);

  if (organization === null) {
    notFound();
  }

  const healthCards = [
    { label: "Membres", value: organization.health.memberCount },
    { label: "Biens", value: organization.health.propertyCount },
    { label: "Unités", value: organization.health.unitCount },
    { label: "Baux actifs", value: organization.health.activeLeaseCount },
    { label: "Paiements en retard", value: organization.health.overduePaymentCount },
    { label: "Maintenance ouverte", value: organization.health.openMaintenanceCount }
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/organizations" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          ← Organisations
        </Link>
        <h2 className="mt-2 text-2xl font-semibold text-[#010a19] dark:text-white">{organization.name}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{organization.id}</p>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Créée le {formatDate(organization.createdAtIso)}
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
        <h3 className="text-base font-semibold text-[#010a19] dark:text-white">Santé organisation</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Compteurs opérationnels (pas d&apos;usage produit — voir PostHog)
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {healthCards.map((card) => (
            <div
              key={card.label}
              className="rounded-lg border border-slate-100 px-3 py-3 dark:border-slate-800"
            >
              <p className="text-xs text-slate-500 dark:text-slate-400">{card.label}</p>
              <p className="mt-1 text-2xl font-semibold text-[#010a19] dark:text-white">{card.value}</p>
            </div>
          ))}
        </div>
      </section>

      <AdminOrganizationStatusForm
        organizationId={organization.id}
        currentStatus={organization.status}
      />

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
        <h3 className="text-base font-semibold text-[#010a19] dark:text-white">Membres</h3>
        {organization.members.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Aucun membre.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {organization.members.map((member) => (
              <li key={member.membershipId} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Link
                    href={`/admin/users/${member.userId}`}
                    className="font-medium text-[#010a19] hover:underline dark:text-white"
                  >
                    {member.email ?? member.userId}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {member.role} · {member.status}
                  </p>
                </div>
                <p className="text-xs text-slate-400">{formatDate(member.createdAtIso)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
        <h3 className="text-base font-semibold text-[#010a19] dark:text-white">Audit organisation (récent)</h3>
        {organization.recentOrgAudit.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Aucun événement d&apos;audit pour cette organisation.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {organization.recentOrgAudit.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-[#010a19] dark:text-white">
                    {getPlatformAuditActionLabel(entry.actionKey)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {entry.entityType}
                    {entry.entityId ? ` · ${entry.entityId}` : ""}
                  </p>
                </div>
                <p className="text-xs text-slate-400">{formatDate(entry.createdAtIso)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
