import { redirect } from "next/navigation";
import { listTenants } from "../../../api";
import type { LeaseWithTenantView } from "@hhousing/api-contracts";
import { createTenantLeaseRepo } from "../../api/shared";
import { getServerAuthSession } from "../../../lib/session";
import TenantManagementPanel from "../../../components/tenant-management-panel";
import type { TenantListItem } from "../../../components/tenant-management.types";

export default async function TenantsPage(): Promise<React.ReactElement> {
  const session = await getServerAuthSession();
  if (!session) redirect("/login");

  const tenantLeaseRepo = createTenantLeaseRepo();

  const [result, leases] = await Promise.all([
    listTenants(
      { session, organizationId: session.organizationId ?? "" },
      { repository: tenantLeaseRepo }
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

  return <TenantManagementPanel organizationId={session.organizationId ?? ""} tenants={tenants} />;
}

