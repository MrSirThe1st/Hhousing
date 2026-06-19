import Link from "next/link";
import { redirect } from "next/navigation";
import ResponsiveTable from "../../../components/responsive-table";
import type { Owner } from "@hhousing/domain";
import { createMaintenanceRepo, createPaymentRepo, createRepositoryFromEnv, createTenantLeaseRepo } from "../../api/shared";
import { requireDashboardSectionAccess } from "../../../lib/dashboard-access";

interface ClientSummary {
  owner: Owner;
  propertyCount: number;
  unitCount: number;
  occupiedUnitCount: number;
  activeTenantCount: number;
  overduePaymentCount: number;
  activeMaintenanceCount: number;
  urgentMaintenanceCount: number;
}

function formatOwnerLocation(owner: Owner): string | null {
  const parts = [owner.city, owner.state, owner.country].filter((value): value is string => Boolean(value));
  return parts.length > 0 ? parts.join(", ") : null;
}

function PlusIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default async function ClientsPage(): Promise<React.ReactElement> {
  const { session } = await requireDashboardSectionAccess("operations");

  const repoResult = createRepositoryFromEnv();

  if (!repoResult.success) {
    return <div className="p-8 text-red-600">Erreur de connexion à la base de données.</div>;
  }

  const tenantLeaseRepo = createTenantLeaseRepo();
  const [owners, properties, leases, payments, maintenanceRequests] = await Promise.all([
    repoResult.data.listOwners(session.organizationId),
    repoResult.data.listPropertiesWithUnits(session.organizationId),
    tenantLeaseRepo.listLeasesByOrganization(session.organizationId),
    createPaymentRepo().listPayments({ organizationId: session.organizationId }),
    createMaintenanceRepo().listMaintenanceRequests({ organizationId: session.organizationId })
  ]);

  const clientOwners = owners.filter((owner) => owner.ownerType === "client");

  const summaries: ClientSummary[] = clientOwners.map((owner) => {
    const ownerProperties = properties.filter((item) => item.property.ownerId === owner.id);
    const unitCount = ownerProperties.reduce((sum, item) => sum + item.units.length, 0);
    const occupiedUnitCount = ownerProperties.reduce(
      (sum, item) => sum + item.units.filter((unit) => unit.status === "occupied").length,
      0
    );
    const unitIds = new Set(ownerProperties.flatMap((item) => item.units.map((unit) => unit.id)));
    const clientLeases = leases.filter((lease) => unitIds.has(lease.unitId));
    const activeLeases = clientLeases.filter((lease) => lease.status === "active");
    const activeTenantCount = new Set(activeLeases.map((lease) => lease.tenantId)).size;
    const clientLeaseIds = new Set(clientLeases.map((lease) => lease.id));
    const overduePaymentCount = payments.filter(
      (payment) => clientLeaseIds.has(payment.leaseId) && payment.status === "overdue"
    ).length;
    const clientMaintenanceRequests = maintenanceRequests.filter((request) => unitIds.has(request.unitId));
    const activeMaintenanceCount = clientMaintenanceRequests.filter(
      (request) => request.status === "open" || request.status === "in_progress"
    ).length;
    const urgentMaintenanceCount = clientMaintenanceRequests.filter(
      (request) => request.priority === "urgent" && (request.status === "open" || request.status === "in_progress")
    ).length;

    return {
      owner,
      propertyCount: ownerProperties.length,
      unitCount,
      occupiedUnitCount,
      activeTenantCount,
      overduePaymentCount,
      activeMaintenanceCount,
      urgentMaintenanceCount
    };
  }).sort((left, right) => {
    if (right.urgentMaintenanceCount !== left.urgentMaintenanceCount) {
      return right.urgentMaintenanceCount - left.urgentMaintenanceCount;
    }

    if (right.overduePaymentCount !== left.overduePaymentCount) {
      return right.overduePaymentCount - left.overduePaymentCount;
    }

    if (right.activeMaintenanceCount !== left.activeMaintenanceCount) {
      return right.activeMaintenanceCount - left.activeMaintenanceCount;
    }

    return left.owner.name.localeCompare(right.owner.name, "fr");
  });

  const organizationProperties = properties.filter((item) => item.property.ownerType === "organization").length;
  const managedPropertyCount = summaries.reduce((sum, summary) => sum + summary.propertyCount, 0);
  const totalUnitCount = summaries.reduce((sum, summary) => sum + summary.unitCount, 0);
  const occupiedUnitCount = summaries.reduce((sum, summary) => sum + summary.occupiedUnitCount, 0);
  const occupancyRate = totalUnitCount === 0 ? 0 : Math.round((occupiedUnitCount / totalUnitCount) * 100);
  const overdueAlertCount = summaries.reduce((sum, summary) => sum + summary.overduePaymentCount, 0);
  const urgentMaintenanceCount = summaries.reduce((sum, summary) => sum + summary.urgentMaintenanceCount, 0);

  return (
    <div id="clients-container" className="space-y-6 p-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#010a19]">Propriétaires</h1>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {clientOwners.length} propriétaire(s) tiers, {managedPropertyCount} biens gérés, {occupancyRate}% d&apos;occupation.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/clients/add"
            className="inline-flex items-center gap-2 rounded-lg bg-[#0063fe] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0052d4]"
          >
            <PlusIcon />
            Ajouter un propriétaire
          </Link>
        </div>
      </div>

<div className="flex items-center gap-8 border-b border-slate-200 pb-3">
  <div>
    <p className="text-xs uppercase tracking-wide text-slate-500">
      Propriétaires tiers
    </p>
    <p className="text-xl font-semibold text-slate-900">
      {clientOwners.length}
    </p>
  </div>

  <div className="h-6 w-px bg-slate-200" />

  <div>
    <p className="text-xs uppercase tracking-wide text-slate-500">
      Occupation
    </p>
    <p className="text-xl font-semibold text-slate-900">
      {occupancyRate}%
    </p>
  </div>
</div>

      {summaries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
          <h2 className="text-lg font-semibold text-[#010a19]">Aucun propriétaire tiers enregistré</h2>
          <p className="mt-2 text-sm text-slate-500">
            Créez votre premier propriétaire pour rattacher proprement ses biens et centraliser son suivi.
          </p>
          <Link
            href="/dashboard/clients/add"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#0063fe] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0052d4]"
          >
            <PlusIcon />
            Ajouter un propriétaire
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold text-[#010a19]">Portefeuille propriétaires</h2>
              <p className="text-sm text-slate-500">
                Vue synthétique des propriétaires tiers, de leur parc géré et des points d&apos;attention opérationnels.
              </p>
            </div>
          </div>
          <ResponsiveTable<ClientSummary>
            keyExtractor={(summary) => summary.owner.id}
            data={summaries}
            onRowClick={(summary) => {
              window.location.href = `/dashboard/clients/${summary.owner.id}`;
            }}
            columns={[
              {
                header: "Propriétaire",
                render: (summary) => (
                  <div className="flex items-start gap-3">
                    {summary.owner.profilePictureUrl ? (
                      <img
                        src={summary.owner.profilePictureUrl}
                        alt={summary.owner.name}
                        className="h-12 w-12 rounded-2xl object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0063fe]/10 text-sm font-semibold text-[#0063fe]">
                        {summary.owner.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <span className="font-semibold text-[#10213d] hover:text-[#0063fe] hover:underline">
                        {summary.owner.name}
                      </span>
                      <div className="mt-1 text-sm text-slate-500">{summary.owner.fullName}</div>
                      {summary.owner.phoneNumber ? (
                        <div className="mt-2 text-xs text-slate-500">{summary.owner.phoneNumber}</div>
                      ) : null}
                    </div>
                  </div>
                )
              },
              {
                header: "Type",
                render: (summary) => (
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                    summary.owner.isCompany
                      ? "bg-blue-50 text-[#0063fe] ring-1 ring-blue-100"
                      : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
                  }`}>
                    {summary.owner.isCompany ? "Société" : "Particulier"}
                  </span>
                )
              },
              {
                header: "Localisation",
                render: (summary) => <span>{formatOwnerLocation(summary.owner) ?? "Non renseignée"}</span>
              },
              {
                header: "Portefeuille",
                render: (summary) => {
                  const ownerOccupancyRate = summary.unitCount > 0
                    ? Math.round((summary.occupiedUnitCount / summary.unitCount) * 100)
                    : 0;
                  return (
                    <div>
                      <div className="font-medium text-[#10213d]">{summary.propertyCount} bien(s)</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {summary.unitCount} unité(s), {ownerOccupancyRate}% occupées
                      </div>
                    </div>
                  );
                }
              },
              {
                header: "Opérations",
                render: (summary) => (
                  <div>
                    <div className="font-medium text-[#10213d]">{summary.activeTenantCount} locataire(s) actif(s)</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {summary.overduePaymentCount} retard(s), {summary.activeMaintenanceCount} maintenance(s) ouverte(s)
                    </div>
                    {summary.urgentMaintenanceCount > 0 ? (
                      <div className="mt-2 inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-100">
                        {summary.urgentMaintenanceCount} urgence(s)
                      </div>
                    ) : null}
                  </div>
                )
              },
              {
                header: "Création",
                render: (summary) => <span>{new Date(summary.owner.createdAtIso).toLocaleDateString("fr-FR")}</span>
              }
            ]}
            renderMobileCard={(summary) => {
              const ownerOccupancyRate = summary.unitCount > 0
                ? Math.round((summary.occupiedUnitCount / summary.unitCount) * 100)
                : 0;
              return (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {summary.owner.profilePictureUrl ? (
                        <img
                          src={summary.owner.profilePictureUrl}
                          alt={summary.owner.name}
                          className="h-12 w-12 rounded-2xl object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0063fe]/10 text-sm font-semibold text-[#0063fe]">
                          {summary.owner.name.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-[#010a19]">{summary.owner.name}</h3>
                        <p className="text-xs text-slate-500">{summary.owner.fullName}</p>
                        <p className="text-xs text-slate-500">{formatOwnerLocation(summary.owner) ?? "Non renseignée"}</p>
                      </div>
                    </div>
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      summary.owner.isCompany
                        ? "bg-blue-50 text-[#0063fe] ring-1 ring-blue-100"
                        : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
                    }`}>
                      {summary.owner.isCompany ? "Société" : "Particulier"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 border-t border-slate-100 pt-3">
                    <div>
                      <p className="font-semibold text-slate-800">Biens gérés</p>
                      <p className="mt-0.5">{summary.propertyCount} biens ({summary.unitCount} unités)</p>
                      <p className="mt-0.5 text-slate-400">Taux occupation: {ownerOccupancyRate}%</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">Opérations</p>
                      <p className="mt-0.5">{summary.activeTenantCount} locataires actifs</p>
                      <p className="mt-0.5 text-slate-400">
                        {summary.overduePaymentCount} retards, {summary.activeMaintenanceCount} tickets
                      </p>
                    </div>
                  </div>

                  {summary.urgentMaintenanceCount > 0 && (
                    <div className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-100">
                      {summary.urgentMaintenanceCount} urgence(s) de maintenance
                    </div>
                  )}

                  <div className="text-xs text-slate-400 border-t border-slate-100 pt-2 flex justify-between">
                    <span>Créé le {new Date(summary.owner.createdAtIso).toLocaleDateString("fr-FR")}</span>
                    <span className="font-semibold text-[#0063fe]">Ouvrir le dossier →</span>
                  </div>
                </div>
              );
            }}
          />
        </div>
      )}
    </div>
  );
}