import Link from "next/link";
import { redirect } from "next/navigation";
import type { OwnerClient } from "@hhousing/domain";
import { createMaintenanceRepo, createPaymentRepo, createRepositoryFromEnv, createTenantLeaseRepo } from "../../api/shared";
import { getOperatorScopeLabel, getServerOperatorContext } from "../../../lib/operator-context";
import { getServerAuthSession } from "../../../lib/session";

interface ClientSummary {
  client: OwnerClient;
  propertyCount: number;
  unitCount: number;
  occupiedUnitCount: number;
  activeTenantCount: number;
  overduePaymentCount: number;
  activeMaintenanceCount: number;
  urgentMaintenanceCount: number;
}

export default async function ClientsPage(): Promise<React.ReactElement> {
  const session = await getServerAuthSession();
  if (!session) redirect("/login");

  const operatorContext = await getServerOperatorContext(session);
  const repoResult = createRepositoryFromEnv();

  if (!repoResult.success) {
    return <div className="p-8 text-red-600">Erreur de connexion à la base de données.</div>;
  }

  const canUseManagedScope = operatorContext.availableScopes.includes("managed");
  if (!canUseManagedScope) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-[#010a19]">Clients</h1>
          <p className="mt-2 text-sm text-gray-600">
            Cette vue est réservée aux opérateurs qui gèrent des biens pour des clients.
          </p>
        </div>
      </div>
    );
  }

  if (operatorContext.currentScope !== "managed") {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-[#010a19]">Clients</h1>
          <p className="mt-2 text-sm text-gray-700">
            Basculez vers {getOperatorScopeLabel("managed").toLowerCase()} dans l&apos;en-tête pour voir vos clients gérés.
          </p>
        </div>
      </div>
    );
  }

  const tenantLeaseRepo = createTenantLeaseRepo();
  const [ownerClients, managedProperties, leases, payments, maintenanceRequests] = await Promise.all([
    repoResult.data.listOwnerClients(session.organizationId),
    repoResult.data.listPropertiesWithUnits(session.organizationId, "managed"),
    tenantLeaseRepo.listLeasesByOrganization(session.organizationId),
    createPaymentRepo().listPayments({ organizationId: session.organizationId }),
    createMaintenanceRepo().listMaintenanceRequests({ organizationId: session.organizationId })
  ]);

  const summaries: ClientSummary[] = ownerClients.map((client) => {
    const properties = managedProperties.filter((item) => item.property.clientId === client.id);
    const unitCount = properties.reduce((sum, item) => sum + item.units.length, 0);
    const occupiedUnitCount = properties.reduce(
      (sum, item) => sum + item.units.filter((unit) => unit.status === "occupied").length,
      0
    );
    const unitIds = new Set(properties.flatMap((item) => item.units.map((unit) => unit.id)));
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
      client,
      propertyCount: properties.length,
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

    return left.client.name.localeCompare(right.client.name, "fr");
  });

  const unassignedManagedProperties = managedProperties.filter((item) => item.property.clientId === null).length;

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#010a19]">Clients</h1>
        <p className="mt-1 text-sm text-gray-500">Vue portefeuille pour les biens gérés.</p>
      </div>

      {unassignedManagedProperties > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {unassignedManagedProperties} bien(s) géré(s) ne sont encore rattachés à aucun client.
        </div>
      ) : null}

      {summaries.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
          Aucun client enregistré pour le moment.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {summaries.map((summary) => {
            const occupancyRate = summary.unitCount > 0
              ? Math.round((summary.occupiedUnitCount / summary.unitCount) * 100)
              : 0;

            return (
              <Link
                key={summary.client.id}
                href={`/dashboard/clients/${summary.client.id}`}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-[#0063fe] hover:bg-[#0063fe]/5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-[#010a19]">{summary.client.name}</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Créé le {new Date(summary.client.createdAtIso).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                    {summary.propertyCount} bien(s)
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-gray-500">Biens</p>
                    <p className="mt-1 text-lg font-semibold text-[#010a19]">{summary.propertyCount}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-gray-500">Unités</p>
                    <p className="mt-1 text-lg font-semibold text-[#010a19]">{summary.unitCount}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-gray-500">Occupation</p>
                    <p className="mt-1 text-lg font-semibold text-[#010a19]">{occupancyRate}%</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div className="rounded-lg bg-blue-50 p-3">
                    <p className="text-blue-700">Locataires actifs</p>
                    <p className="mt-1 text-lg font-semibold text-[#010a19]">{summary.activeTenantCount}</p>
                  </div>
                  <div className="rounded-lg bg-rose-50 p-3">
                    <p className="text-rose-700">Retards</p>
                    <p className="mt-1 text-lg font-semibold text-[#010a19]">{summary.overduePaymentCount}</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-3">
                    <p className="text-amber-700">Maintenance ouverte</p>
                    <p className="mt-1 text-lg font-semibold text-[#010a19]">{summary.activeMaintenanceCount}</p>
                  </div>
                </div>

                {summary.urgentMaintenanceCount > 0 ? (
                  <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {summary.urgentMaintenanceCount} demande(s) urgente(s) a traiter en priorite.
                  </div>
                ) : null}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}