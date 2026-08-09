import Link from "next/link";
import ClientsSummaryTable, {
  type ClientSummary
} from "../../../components/clients-summary-table";
import DashboardPageLoadError from "../../../components/dashboard-page-load-error";
import { createPaymentRepo, createRepositoryFromEnv, createTenantLeaseRepo } from "../../api/shared";
import { requireDashboardSectionAccess } from "../../../lib/dashboard-access";

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

  let summaries: ClientSummary[] = [];
  let clientOwnerCount = 0;
  let occupancyRate = 0;
  let managedPropertyCount = 0;
  let loadError: string | null = null;

  try {
    const tenantLeaseRepo = createTenantLeaseRepo();

    // Wave 1: structural portfolio data (must succeed for a useful table).
    const [owners, properties] = await Promise.all([
      repoResult.data.listOwners(session.organizationId),
      repoResult.data.listPropertiesWithUnits(session.organizationId)
    ]);

    // Wave 2: secondary metrics — avoid opening four cold pooler connections at once.
    const [leases, payments] = await Promise.all([
      tenantLeaseRepo.listLeasesByOrganization(session.organizationId),
      createPaymentRepo().listPayments({ organizationId: session.organizationId })
    ]);

    const clientOwners = owners.filter((owner) => owner.ownerType === "client");
    clientOwnerCount = clientOwners.length;

    summaries = clientOwners.map((owner) => {
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

      return {
        owner,
        propertyCount: ownerProperties.length,
        unitCount,
        occupiedUnitCount,
        activeTenantCount,
        overduePaymentCount
      };
    }).sort((left, right) => {
      if (right.overduePaymentCount !== left.overduePaymentCount) {
        return right.overduePaymentCount - left.overduePaymentCount;
      }

      return left.owner.name.localeCompare(right.owner.name, "fr");
    });

    managedPropertyCount = summaries.reduce((sum, summary) => sum + summary.propertyCount, 0);
    const totalUnitCount = summaries.reduce((sum, summary) => sum + summary.unitCount, 0);
    const occupiedUnitCount = summaries.reduce((sum, summary) => sum + summary.occupiedUnitCount, 0);
    occupancyRate = totalUnitCount === 0 ? 0 : Math.round((occupiedUnitCount / totalUnitCount) * 100);
  } catch (error) {
    console.error("Failed to load clients workspace", error);
    loadError = "Impossible de charger les propriétaires pour le moment. Réessayez dans un instant.";
  }

  return (
    <div id="clients-container" className="space-y-6 p-8">
      {loadError ? <DashboardPageLoadError message={loadError} /> : null}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#010a19]">Propriétaires</h1>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {clientOwnerCount} propriétaire(s) tiers, {managedPropertyCount} biens gérés, {occupancyRate}% d&apos;occupation.
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
            {clientOwnerCount}
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

      {summaries.length === 0 && !loadError ? (
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
      ) : summaries.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold text-[#010a19]">Biens des propriétaires</h2>
              <p className="text-sm text-slate-500">
                Vue synthétique des propriétaires tiers, de leurs biens gérés et des points d&apos;attention.
              </p>
            </div>
          </div>
          <ClientsSummaryTable summaries={summaries} />
        </div>
      ) : null}
    </div>
  );
}
