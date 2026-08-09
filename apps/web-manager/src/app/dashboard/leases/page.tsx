import type { LeaseWithTenantView } from "@hhousing/api-contracts";
import LeaseManagementPanel from "../../../components/lease-management-panel";
import { createTenantLeaseRepo } from "../../api/shared";
import ReadOnlyBanner from "../../../components/read-only-banner";
import { requireDashboardSectionAccess } from "../../../lib/dashboard-access";

type LeasesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LeasesPage({ searchParams }: LeasesPageProps): Promise<React.ReactElement> {
  const { session, access } = await requireDashboardSectionAccess("operations");
  const params = await searchParams;
  const status =
    typeof params?.status === "string" && params.status.length > 0 && params.status !== "all"
      ? params.status
      : null;

  const tenantRepo = createTenantLeaseRepo();
  const [leasesPage, statusCounts] = await Promise.all([
    tenantRepo.listLeasesPage({
      organizationId: session.organizationId,
      status,
      limit: 50,
      cursor: null
    }),
    tenantRepo.getLeaseStatusCounts(session.organizationId)
  ]);

  const leases: LeaseWithTenantView[] = leasesPage.leases;

  return (
    <div id="leases-container">
      {!access.operationsWritable && <ReadOnlyBanner />}
      <LeaseManagementPanel leases={leases} statusCounts={statusCounts} />
    </div>
  );
}
