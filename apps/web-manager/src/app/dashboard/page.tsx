import { redirect } from "next/navigation";
import Link from "next/link";
import DashboardTasksPanel from "../../components/dashboard-tasks-panel";
import { getServerAuthSession } from "../../lib/session";
import { getOperatorScopeLabel, getServerOperatorContext } from "../../lib/operator-context";
import { createRepositoryFromEnv, createTenantLeaseRepo, createMaintenanceRepo } from "../api/shared";
import { buildDashboardWorkflowData } from "../../lib/dashboard-workflow";
import DashboardCalendar from "../../components/dashboard-calendar";

type DashboardTab = "overview" | "tasks" | "calendar";

type DashboardPageProps = {
  searchParams?: Promise<{
    tab?: string;
  }>;
};

type DashboardMetrics = {
  propertyCount: number;
  unitCount: number;
  tenantCount: number;
  leaseCount: number;
  maintenanceCount: number;
  occupiedUnitCount: number;
};

function getDashboardTab(tab: string | undefined): DashboardTab {
  if (tab === "tasks" || tab === "calendar") {
    return tab;
  }

  return "overview";
}

function getVariantHeader(experience: "self_managed_owner" | "manager_for_others" | "mixed_operator"): { title: string; subtitle: string } {
  if (experience === "self_managed_owner") {
    return {
      title: "Vue proprietaire-operateur",
      subtitle: "Focus revenus, occupation, profit"
    };
  }

  if (experience === "manager_for_others") {
    return {
      title: "Vue property manager",
      subtitle: "Focus tâches, maintenance, collecte"
    };
  }

  return {
    title: "Vue hybride",
    subtitle: "Revenus owned + operations managed"
  };
}

async function fetchDashboardMetrics(
  organizationId: string,
  managementContext: "owned" | "managed"
): Promise<DashboardMetrics> {
  const propertyRepo = createRepositoryFromEnv();
  const tenantLeaseRepo = createTenantLeaseRepo();
  const maintenanceRepo = createMaintenanceRepo();

  if (!propertyRepo.success) {
    return {
      propertyCount: 0,
      unitCount: 0,
      tenantCount: 0,
      leaseCount: 0,
      maintenanceCount: 0,
      occupiedUnitCount: 0
    };
  }

  try {
    const [properties, leases, maintenanceRequests] = await Promise.all([
      propertyRepo.data.listPropertiesWithUnits(organizationId, managementContext),
      tenantLeaseRepo.listLeasesByOrganization(organizationId),
      maintenanceRepo.listMaintenanceRequests({ organizationId, unitId: undefined, status: undefined })
    ]);

    const unitCount = properties.reduce((sum, prop) => sum + prop.units.length, 0);
    const unitIds = new Set(properties.flatMap((property) => property.units.map((unit) => unit.id)));
    const occupiedUnitCount = properties.reduce(
      (sum, property) => sum + property.units.filter((unit) => unit.status === "occupied").length,
      0
    );
    const scopedLeases = leases.filter((lease) => unitIds.has(lease.unitId));
    const tenantIds = new Set(scopedLeases.map((lease) => lease.tenantId));
    const scopedMaintenance = maintenanceRequests.filter((request) => unitIds.has(request.unitId));

    return {
      propertyCount: properties.length,
      unitCount,
      tenantCount: tenantIds.size,
      leaseCount: scopedLeases.length,
      maintenanceCount: scopedMaintenance.filter(
        (request) => request.status === "open" || request.status === "in_progress"
      ).length,
      occupiedUnitCount
    };
  } catch {
    return {
      propertyCount: 0,
      unitCount: 0,
      tenantCount: 0,
      leaseCount: 0,
      maintenanceCount: 0,
      occupiedUnitCount: 0
    };
  }
}

function getStats(
  experience: "self_managed_owner" | "manager_for_others" | "mixed_operator",
  scopeLabel: string,
  metrics: DashboardMetrics
): Array<{ label: string; value: string }> {
  const occupancyRate = metrics.unitCount > 0
    ? Math.round((metrics.occupiedUnitCount / metrics.unitCount) * 100)
    : 0;

  if (experience === "self_managed_owner") {
    return [
      { label: `Proprietes (${scopeLabel})`, value: metrics.propertyCount.toString() },
      { label: "Unités totales", value: metrics.unitCount.toString() },
      { label: "Taux d'occupation", value: `${occupancyRate}%` },
      { label: "Locataires actifs", value: metrics.tenantCount.toString() },
      { label: "Baux actifs", value: metrics.leaseCount.toString() },
      { label: "Demandes maintenance", value: metrics.maintenanceCount.toString() }
    ];
  }

  if (experience === "manager_for_others") {
    return [
      { label: `Biens (${scopeLabel})`, value: metrics.propertyCount.toString() },
      { label: `Unites (${scopeLabel})`, value: metrics.unitCount.toString() },
      { label: "Locataires actifs", value: metrics.tenantCount.toString() },
      { label: "Taux d'occupation", value: `${occupancyRate}%` },
      { label: "Incidents maintenance", value: metrics.maintenanceCount.toString() },
      { label: "Baux actifs", value: metrics.leaseCount.toString() }
    ];
  }

  return [
    { label: `Proprietes (${scopeLabel})`, value: metrics.propertyCount.toString() },
    { label: `Unites (${scopeLabel})`, value: metrics.unitCount.toString() },
    { label: "Locataires actifs", value: metrics.tenantCount.toString() },
    { label: "Baux actifs", value: metrics.leaseCount.toString() },
    { label: "Taux d'occupation", value: `${occupancyRate}%` },
    { label: "Demandes en cours", value: metrics.maintenanceCount.toString() }
  ];
}

export default async function DashboardPage({ searchParams }: DashboardPageProps): Promise<React.ReactElement> {
  const session = await getServerAuthSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const activeTab = getDashboardTab(params?.tab);

  const operatorContext = await getServerOperatorContext(session);
  const scopeLabel = getOperatorScopeLabel(operatorContext.currentScope);
  const header = getVariantHeader(operatorContext.experience);

  const metrics = activeTab === "overview"
    ? await fetchDashboardMetrics(session.organizationId, operatorContext.currentScope)
    : { propertyCount: 0, unitCount: 0, tenantCount: 0, leaseCount: 0, maintenanceCount: 0, occupiedUnitCount: 0 };
  const stats = getStats(operatorContext.experience, scopeLabel, metrics);
  const workflowData = activeTab === "overview" ? null : await buildDashboardWorkflowData(session);

  const hasNoData = metrics.propertyCount === 0;
  const tabs: Array<{ id: DashboardTab; label: string; href: string }> = [
    { id: "overview", label: "Vue d'ensemble", href: "/dashboard" },
    { id: "tasks", label: "Tâches", href: "/dashboard?tab=tasks" },
    { id: "calendar", label: "Calendrier", href: "/dashboard?tab=calendar" },
  ];

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#010a19]">{header.title}</h1>
          <p className="mt-2 text-sm text-slate-500">{header.subtitle}</p>
          <p className="mt-1 text-sm text-slate-500">Affichage courant: {scopeLabel}</p>
        </div>
        {hasNoData && (
          <Link
            href="/dashboard/properties/add"
            className="inline-flex items-center rounded-lg bg-[#0063fe] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0052d4]"
          >
            Ajouter un bien
          </Link>
        )}
      </div>

      <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === tab.id
                ? "bg-[#0063fe] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {activeTab === "overview" ? (
        <>
          {hasNoData && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <svg className="h-8 w-8 text-[#0063fe]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-[#010a19]">Commencez par alimenter votre portfolio</h2>
              <p className="mt-2 text-sm text-slate-500">
                Votre tableau de bord affichera les métriques une fois que vous aurez ajouté des biens et unités.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Link
                  href="/dashboard/properties/add"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0063fe] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0052d4]"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Ajouter un bien
                </Link>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <p className="text-xs uppercase tracking-wide text-slate-500">{stat.label}</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-[#010a19]">{stat.value}</p>
              </div>
            ))}
          </div>
        </>
      ) : activeTab === "calendar" ? (
        workflowData ? (
          <DashboardCalendar
            organizationId={session.organizationId}
            currentUserId={session.userId}
            entries={workflowData.calendarEntries}
            relatedOptions={workflowData.relatedOptions}
            scopeLabel={scopeLabel}
          />
        ) : null
      ) : (
        workflowData ? (
          <DashboardTasksPanel
            organizationId={session.organizationId}
            currentUserId={session.userId}
            tasks={workflowData.tasks}
            relatedOptions={workflowData.relatedOptions}
          />
        ) : null
      )}
    </div>
  );
}
