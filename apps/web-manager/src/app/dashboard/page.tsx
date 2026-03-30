import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerAuthSession } from "../../lib/session";
import { createRepositoryFromEnv, createTenantLeaseRepo, createMaintenanceRepo } from "../api/shared";

type DashboardVariant = "self_managed_owner" | "manager_for_others" | "mixed_operator" | "tenant" | "standard";

type DashboardPageProps = {
  searchParams?: Promise<{
    variant?: string;
  }>;
};

type DashboardMetrics = {
  propertyCount: number;
  unitCount: number;
  tenantCount: number;
  leaseCount: number;
  maintenanceCount: number;
};

function getVariant(raw?: string): DashboardVariant {
  if (raw === "self_managed_owner") return raw;
  if (raw === "manager_for_others") return raw;
  if (raw === "mixed_operator") return raw;
  if (raw === "tenant") return raw;
  return "standard";
}

function getVariantHeader(variant: DashboardVariant): { title: string; subtitle: string } {
  if (variant === "self_managed_owner") {
    return {
      title: "Vue propriétaire-opérateur",
      subtitle: "Focus revenus, occupation, profit"
    };
  }

  if (variant === "manager_for_others") {
    return {
      title: "Vue property manager",
      subtitle: "Focus tâches, maintenance, collecte"
    };
  }

  if (variant === "mixed_operator") {
    return {
      title: "Vue hybride",
      subtitle: "Revenus owned + opérations managed"
    };
  }

  if (variant === "tenant") {
    return {
      title: "Vue démarrage",
      subtitle: "Créez votre première propriété ou rejoignez une organisation"
    };
  }

  return {
    title: "Vue d'ensemble",
    subtitle: "Suivi global de vos opérations"
  };
}

async function fetchDashboardMetrics(organizationId: string): Promise<DashboardMetrics> {
  const propertyRepo = createRepositoryFromEnv();
  const tenantLeaseRepo = createTenantLeaseRepo();
  const maintenanceRepo = createMaintenanceRepo();

  if (!propertyRepo.success) {
    return {
      propertyCount: 0,
      unitCount: 0,
      tenantCount: 0,
      leaseCount: 0,
      maintenanceCount: 0
    };
  }

  try {
    const [properties, tenants, leases, maintenanceRequests] = await Promise.all([
      propertyRepo.data.listPropertiesWithUnits(organizationId),
      tenantLeaseRepo.listTenantsByOrganization(organizationId),
      tenantLeaseRepo.listLeasesByOrganization(organizationId),
      maintenanceRepo.listMaintenanceRequests({ organizationId, unitId: null, status: null })
    ]);

    const unitCount = properties.reduce((sum, prop) => sum + prop.units.length, 0);

    return {
      propertyCount: properties.length,
      unitCount,
      tenantCount: tenants.length,
      leaseCount: leases.length,
      maintenanceCount: maintenanceRequests.length
    };
  } catch {
    return {
      propertyCount: 0,
      unitCount: 0,
      tenantCount: 0,
      leaseCount: 0,
      maintenanceCount: 0
    };
  }
}

function getStats(variant: DashboardVariant, metrics: DashboardMetrics): Array<{ label: string; value: string }> {
  const occupancyRate = metrics.unitCount > 0
    ? Math.round((metrics.leaseCount / metrics.unitCount) * 100)
    : 0;

  if (variant === "self_managed_owner") {
    return [
      { label: "Vos propriétés", value: metrics.propertyCount.toString() },
      { label: "Unités totales", value: metrics.unitCount.toString() },
      { label: "Taux d'occupation", value: `${occupancyRate}%` },
      { label: "Locataires actifs", value: metrics.tenantCount.toString() },
      { label: "Baux actifs", value: metrics.leaseCount.toString() },
      { label: "Demandes maintenance", value: metrics.maintenanceCount.toString() }
    ];
  }

  if (variant === "manager_for_others") {
    return [
      { label: "Biens gérés", value: metrics.propertyCount.toString() },
      { label: "Unités gérées", value: metrics.unitCount.toString() },
      { label: "Locataires actifs", value: metrics.tenantCount.toString() },
      { label: "Taux d'occupation", value: `${occupancyRate}%` },
      { label: "Incidents maintenance", value: metrics.maintenanceCount.toString() },
      { label: "Baux actifs", value: metrics.leaseCount.toString() }
    ];
  }

  if (variant === "mixed_operator") {
    return [
      { label: "Propriétés totales", value: metrics.propertyCount.toString() },
      { label: "Unités totales", value: metrics.unitCount.toString() },
      { label: "Occupation globale", value: `${occupancyRate}%` },
      { label: "Locataires actifs", value: metrics.tenantCount.toString() },
      { label: "Baux actifs", value: metrics.leaseCount.toString() },
      { label: "Demandes en cours", value: metrics.maintenanceCount.toString() }
    ];
  }

  if (variant === "tenant") {
    return [
      { label: "Propriétés", value: metrics.propertyCount.toString() },
      { label: "Unités", value: metrics.unitCount.toString() },
      { label: "Locataires", value: metrics.tenantCount.toString() },
      { label: "Baux actifs", value: metrics.leaseCount.toString() },
      { label: "Progression setup", value: metrics.propertyCount > 0 ? "50%" : "0%" }
    ];
  }

  return [
    { label: "Propriétés", value: metrics.propertyCount.toString() },
    { label: "Unités", value: metrics.unitCount.toString() },
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
  const variant = getVariant(params?.variant);
  const header = getVariantHeader(variant);

  const metrics = await fetchDashboardMetrics(session.organizationId);
  const stats = getStats(variant, metrics);

  const hasNoData = metrics.propertyCount === 0;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#010a19] mb-1">{header.title}</h1>
          <p className="text-sm text-gray-600">{header.subtitle}</p>
        </div>
        {hasNoData && (
          <Link
            href="/dashboard/properties"
            className="rounded-lg bg-[#0063fe] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0052d4]"
          >
            Ajouter une propriété
          </Link>
        )}
      </div>

      {hasNoData && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-6">
          <h2 className="text-lg font-semibold text-[#010a19] mb-2">Commencez par créer votre première propriété</h2>
          <p className="text-sm text-gray-700 mb-4">
            Votre tableau de bord affichera les métriques une fois que vous aurez ajouté des propriétés et unités.
          </p>
          <div className="flex gap-3">
            <Link
              href="/dashboard/properties"
              className="inline-flex items-center gap-2 rounded-lg border border-[#0063fe] bg-white px-4 py-2 text-sm font-semibold text-[#0063fe] hover:bg-[#0063fe]/5"
            >
              Créer une propriété
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="mt-1 text-3xl font-semibold text-[#010a19]">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
