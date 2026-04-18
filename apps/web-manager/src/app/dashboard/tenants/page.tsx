import { redirect } from "next/navigation";
import { listTenants } from "../../../api";
import type { LeaseWithTenantView } from "@hhousing/api-contracts";
import { createTeamFunctionsRepo, createTenantLeaseRepo } from "../../api/shared";
import ReadOnlyBanner from "../../../components/read-only-banner";
import { requireDashboardSectionAccess } from "../../../lib/dashboard-access";
import TenantManagementPanel from "../../../components/tenant-management-panel";
import type { TenantListItem } from "../../../components/tenant-management.types";

export default async function TenantsPage(): Promise<React.ReactElement> {
  const { session, access } = await requireDashboardSectionAccess("operations");

  const tenantLeaseRepo = createTenantLeaseRepo();

  const [result, leases] = await Promise.all([
    listTenants(
      { session, organizationId: session.organizationId ?? "" },
      {
        repository: tenantLeaseRepo,
        teamFunctionsRepository: createTeamFunctionsRepo()
      }
    ),
    tenantLeaseRepo.listLeasesByOrganization(session.organizationId ?? "")
  ]);

  const currentLeaseTenantIds = new Set(
    leases
      .filter((lease: LeaseWithTenantView) => lease.status === "active" || lease.status === "pending")
      .map((lease: LeaseWithTenantView) => lease.tenantId)
  );

  const tenants: TenantListItem[] = result.body.success
    ? result.body.data.tenants.map((tenant) => ({
        tenant,
        hasLease: currentLeaseTenantIds.has(tenant.id)
      }))
    : [];

  return (
    <>
      {!access.operationsWritable && <ReadOnlyBanner />}
      <TenantManagementPanel organizationId={session.organizationId ?? ""} tenants={tenants} />
    </>
  );
}

