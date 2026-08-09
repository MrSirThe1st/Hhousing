import { listTenants } from "../../../api";
import { createTeamFunctionsRepo, createTenantLeaseRepo } from "../../api/shared";
import ReadOnlyBanner from "../../../components/read-only-banner";
import DashboardPageLoadError from "../../../components/dashboard-page-load-error";
import { requireDashboardSectionAccess } from "../../../lib/dashboard-access";
import TenantManagementPanel from "../../../components/tenant-management-panel";
import type { TenantListItem } from "../../../components/tenant-management.types";

export default async function TenantsPage(): Promise<React.ReactElement> {
  const { session, access } = await requireDashboardSectionAccess("operations");

  const tenantLeaseRepo = createTenantLeaseRepo();
  let tenants: TenantListItem[] = [];
  let loadError: string | null = null;

  try {
    const [result, currentLeaseTenantIds] = await Promise.all([
      listTenants(
        { session, organizationId: session.organizationId ?? "" },
        {
          repository: tenantLeaseRepo,
          teamFunctionsRepository: createTeamFunctionsRepo()
        }
      ),
      tenantLeaseRepo.listTenantIdsWithCurrentLeases(session.organizationId ?? "")
    ]);

    const currentLeaseTenantIdSet = new Set(currentLeaseTenantIds);

    tenants = result.body.success
      ? result.body.data.tenants.map((tenant) => ({
          tenant,
          hasLease: currentLeaseTenantIdSet.has(tenant.id)
        }))
      : [];
  } catch (error) {
    console.error("Failed to load tenants workspace", error);
    loadError = "Impossible de charger les locataires pour le moment. Réessayez dans un instant.";
  }

  return (
    <div id="tenants-container">
      {loadError ? <DashboardPageLoadError message={loadError} /> : null}
      {!access.operationsWritable && <ReadOnlyBanner />}
      <TenantManagementPanel organizationId={session.organizationId ?? ""} tenants={tenants} />
    </div>
  );
}
