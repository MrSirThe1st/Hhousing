import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createMaintenanceRepo, createPaymentRepo, createRepositoryFromEnv, createTenantLeaseRepo } from "../../../api/shared";
import ActionMenu from "../../../../components/action-menu";
import ClientPortfolioTable from "../../../../components/client-portfolio-table";
import OwnerDocumentsSectionClient from "../../../../components/owner-documents-section-client";
import { requireDashboardSectionAccess } from "../../../../lib/dashboard-access";

function formatCurrencySummary(summary: Map<string, number>): string {
  if (summary.size === 0) {
    return "0";
  }

  return [...summary.entries()]
    .map(([currency, amount]) => `${amount.toLocaleString("fr-FR")} ${currency}`)
    .join(" • ");
}

function addAmount(summary: Map<string, number>, currencyCode: string, amount: number): void {
  summary.set(currencyCode, (summary.get(currencyCode) ?? 0) + amount);
}

function formatMaintenanceStatusLabel(status: "open" | "in_progress" | "resolved" | "cancelled"): string {
  switch (status) {
    case "open":
      return "Ouverte";
    case "in_progress":
      return "En cours";
    case "resolved":
      return "Résolue";
    case "cancelled":
      return "Annulée";
    default:
      return status;
  }
}

function formatMaintenancePriorityLabel(priority: "low" | "medium" | "high" | "urgent"): string {
  switch (priority) {
    case "low":
      return "Faible";
    case "medium":
      return "Moyenne";
    case "high":
      return "Haute";
    case "urgent":
      return "Urgente";
    default:
      return priority;
  }
}

function getMaintenanceStatusTone(status: "open" | "in_progress" | "resolved" | "cancelled"): string {
  switch (status) {
    case "open":
      return "bg-amber-100 text-amber-800";
    case "in_progress":
      return "bg-blue-100 text-blue-800";
    case "resolved":
      return "bg-emerald-100 text-emerald-800";
    case "cancelled":
      return "bg-gray-100 text-gray-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function formatOwnerLocation(city: string | null, state: string | null, country: string | null): string | null {
  const parts = [city, state, country].filter((value): value is string => Boolean(value));
  return parts.length > 0 ? parts.join(", ") : null;
}

export default async function ClientDetailPage(
  { params }: { params: Promise<{ id: string }> }
): Promise<React.ReactElement> {
  const { session } = await requireDashboardSectionAccess("operations");

  const { id } = await params;
  const repoResult = createRepositoryFromEnv();

  if (!repoResult.success) {
    return <div className="p-8 text-red-600">Erreur de connexion à la base de données.</div>;
  }

  const tenantLeaseRepo = createTenantLeaseRepo();
  const [client, properties, leases, tenants, payments, maintenanceRequests] = await Promise.all([
    repoResult.data.getOwnerById(id, session.organizationId),
    repoResult.data.listPropertiesWithUnits(session.organizationId, { ownerId: id }),
    tenantLeaseRepo.listLeasesByOrganization(session.organizationId),
    tenantLeaseRepo.listTenantsByOrganization(session.organizationId),
    createPaymentRepo().listPayments({ organizationId: session.organizationId }),
    createMaintenanceRepo().listMaintenanceRequests({ organizationId: session.organizationId })
  ]);

  if (!client || client.ownerType !== "client") {
    notFound();
  }

  const propertyRows = properties.map((item) => ({
    property: item.property,
    unitCount: item.units.length,
    occupiedUnitCount: item.units.filter((unit) => unit.status === "occupied").length
  }));
  const unitCount = properties.reduce((sum, item) => sum + item.units.length, 0);
  const occupiedUnitCount = properties.reduce(
    (sum, item) => sum + item.units.filter((unit) => unit.status === "occupied").length,
    0
  );
  const occupancyRate = unitCount > 0 ? Math.round((occupiedUnitCount / unitCount) * 100) : 0;
  const unitIds = new Set(properties.flatMap((item) => item.units.map((unit) => unit.id)));
  const unitDetails = new Map(
    properties.flatMap((item) => item.units.map((unit) => [unit.id, { propertyName: item.property.name, unitNumber: unit.unitNumber }]))
  );
  const clientLeases = leases.filter((lease) => unitIds.has(lease.unitId));
  const activeLeases = clientLeases.filter((lease) => lease.status === "active");
  const activeTenantIds = new Set(activeLeases.map((lease) => lease.tenantId));
  const clientTenantIds = new Set(clientLeases.map((lease) => lease.tenantId));
  const tenantsById = new Map(tenants.map((tenant) => [tenant.id, tenant]));
  const clientTenants = [...clientTenantIds]
    .map((tenantId) => tenantsById.get(tenantId))
    .filter((tenant): tenant is NonNullable<typeof tenant> => tenant !== undefined)
    .sort((left, right) => left.fullName.localeCompare(right.fullName, "fr"));
  const clientLeaseIds = new Set(clientLeases.map((lease) => lease.id));
  const clientPayments = payments.filter((payment) => clientLeaseIds.has(payment.leaseId));
  const clientMaintenanceRequests = maintenanceRequests
    .filter((request) => unitIds.has(request.unitId))
    .sort((left, right) => right.createdAtIso.localeCompare(left.createdAtIso));
  const currentMonth = new Date().toISOString().slice(0, 7);

  const monthlyExpected = new Map<string, number>();
  const collectedThisMonth = new Map<string, number>();
  const overdueBalance = new Map<string, number>();

  for (const lease of activeLeases) {
    addAmount(monthlyExpected, lease.currencyCode, lease.monthlyRentAmount);
  }

  for (const payment of clientPayments) {
    if (payment.status === "paid" && payment.paidDate?.startsWith(currentMonth)) {
      addAmount(collectedThisMonth, payment.currencyCode, payment.amount);
    }

    if (payment.status === "overdue") {
      addAmount(overdueBalance, payment.currencyCode, payment.amount);
    }
  }

  const openMaintenanceCount = clientMaintenanceRequests.filter((request) => request.status === "open").length;
  const inProgressMaintenanceCount = clientMaintenanceRequests.filter((request) => request.status === "in_progress").length;
  const urgentMaintenanceCount = clientMaintenanceRequests.filter(
    (request) => request.priority === "urgent" && ["open", "in_progress"].includes(request.status)
  ).length;
  const recentTenantLeases = activeLeases
    .slice()
    .sort((left, right) => right.startDate.localeCompare(left.startDate))
    .slice(0, 5);
  const recentMaintenanceRequests = clientMaintenanceRequests.slice(0, 5);
  const location = formatOwnerLocation(client.city, client.state, client.country);

  return (
    <div className="p-8 space-y-6">
      <div>
        <Link href="/dashboard/clients" className="mb-4 inline-block text-sm text-[#0063fe] hover:underline">
          ← Retour aux propriétaires
        </Link>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            {client.profilePictureUrl ? (
              <img src={client.profilePictureUrl} alt={client.name} className="h-20 w-20 rounded-2xl object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#0063fe]/10 text-2xl font-semibold text-[#0063fe]">
                {client.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold text-[#010a19]">{client.name}</h1>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                  {client.isCompany ? "Société" : "Particulier"}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Contact principal: {client.fullName}
              </p>
              {client.companyName && client.companyName !== client.name ? (
                <p className="mt-1 text-sm text-gray-500">Société: {client.companyName}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-600">
                {client.phoneNumber ? <span>{client.phoneNumber}</span> : null}
                {location ? <span>{location}</span> : null}
                {client.address ? <span>{client.address}</span> : null}
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Profil créé le {new Date(client.createdAtIso).toLocaleDateString("fr-FR")}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-3 lg:items-end">
            <ActionMenu
              triggerLabel="Actions"
              items={[
                { label: "Modifier le client", href: `/dashboard/clients/${client.id}/edit` },
                { label: "Affecter un bien / Inviter", href: `/dashboard/clients/${client.id}/assign` }
              ]}
            />
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 lg:max-w-sm">
              Les documents liés à ce propriétaire sont centralisés sur cette fiche et restent séparés de la bibliothèque générale.
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Biens gérés</p>
          <p className="mt-1 text-3xl font-semibold text-[#010a19]">{properties.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Unités</p>
          <p className="mt-1 text-3xl font-semibold text-[#010a19]">{unitCount}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Taux d'occupation</p>
          <p className="mt-1 text-3xl font-semibold text-[#010a19]">{occupancyRate}%</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Baux actifs</p>
          <p className="mt-1 text-3xl font-semibold text-[#010a19]">{activeLeases.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Locataires actifs</p>
          <p className="mt-1 text-3xl font-semibold text-[#010a19]">{activeTenantIds.size}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Loyer mensuel attendu</p>
          <p className="mt-1 text-sm font-semibold text-[#010a19]">{formatCurrencySummary(monthlyExpected)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Encaisse ce mois</p>
          <p className="mt-1 text-sm font-semibold text-[#010a19]">{formatCurrencySummary(collectedThisMonth)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Solde en retard</p>
          <p className="mt-1 text-sm font-semibold text-[#010a19]">{formatCurrencySummary(overdueBalance)}</p>
        </div>
      </div>

      <ClientPortfolioTable
        currentClientId={client.id}
        properties={propertyRows}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[#010a19]">Locataires du portefeuille</h2>
              <p className="mt-1 text-sm text-gray-500">
                {clientTenants.length} locataire(s) rattaché(s) à ce propriétaire, dont {activeTenantIds.size} actif(s).
              </p>
            </div>
            <Link href="/dashboard/tenants" className="text-sm font-medium text-[#0063fe] hover:underline">
              Voir tous les locataires
            </Link>
          </div>

          {recentTenantLeases.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">Aucun bail actif sur ce portefeuille.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {recentTenantLeases.map((lease) => {
                const tenant = tenantsById.get(lease.tenantId);
                const unit = unitDetails.get(lease.unitId);

                return (
                  <div key={lease.id} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-[#010a19]">{tenant?.fullName ?? lease.tenantFullName}</p>
                        <p className="mt-1 text-sm text-gray-500">
                          {unit ? `${unit.propertyName} • Unité ${unit.unitNumber}` : "Unité non disponible"}
                        </p>
                      </div>
                      <Link href={`/dashboard/tenants/${lease.tenantId}`} className="text-sm font-medium text-[#0063fe] hover:underline">
                        Ouvrir
                      </Link>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                      <span>Bail depuis le {new Date(lease.startDate).toLocaleDateString("fr-FR")}</span>
                      <span>{lease.monthlyRentAmount.toLocaleString("fr-FR")} {lease.currencyCode}/mois</span>
                      <span>{tenant?.email ?? "Aucun e-mail"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[#010a19]">Maintenance</h2>
              <p className="mt-1 text-sm text-gray-500">
                {clientMaintenanceRequests.length} demande(s) sur ce portefeuille, dont {openMaintenanceCount + inProgressMaintenanceCount} en cours de traitement.
              </p>
            </div>
            <Link href="/dashboard/maintenance" className="text-sm font-medium text-[#0063fe] hover:underline">
              Voir toute la maintenance
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-gray-500">Ouvertes</p>
              <p className="mt-1 text-lg font-semibold text-[#010a19]">{openMaintenanceCount}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-gray-500">En cours</p>
              <p className="mt-1 text-lg font-semibold text-[#010a19]">{inProgressMaintenanceCount}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-gray-500">Urgentes</p>
              <p className="mt-1 text-lg font-semibold text-[#010a19]">{urgentMaintenanceCount}</p>
            </div>
          </div>

          {recentMaintenanceRequests.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">Aucune demande de maintenance sur ce portefeuille.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {recentMaintenanceRequests.map((request) => {
                const unit = unitDetails.get(request.unitId);

                return (
                  <div key={request.id} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-[#010a19]">{request.title}</p>
                        <p className="mt-1 text-sm text-gray-500">
                          {unit ? `${unit.propertyName} • Unité ${unit.unitNumber}` : "Unité non disponible"}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
                        <span className={`rounded-full px-2.5 py-1 font-medium ${getMaintenanceStatusTone(request.status)}`}>
                          {formatMaintenanceStatusLabel(request.status)}
                        </span>
                        <span className="rounded-full bg-rose-100 px-2.5 py-1 font-medium text-rose-700">
                          {formatMaintenancePriorityLabel(request.priority)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                      <span>Maj le {new Date(request.updatedAtIso).toLocaleDateString("fr-FR")}</span>
                      <span>{request.assignedToName ?? "Aucun intervenant assigné"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <OwnerDocumentsSectionClient ownerId={client.id} />
    </div>
  );
}
