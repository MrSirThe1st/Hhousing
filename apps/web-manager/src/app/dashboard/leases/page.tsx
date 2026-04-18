import { redirect } from "next/navigation";
import type { LeaseWithTenantView } from "@hhousing/api-contracts";
import { listLeases } from "../../../api";
import LeaseManagementPanel from "../../../components/lease-management-panel";
import { filterLeasesByScope, getScopedPortfolioData } from "../../../lib/operator-scope-portfolio";
import { createTeamFunctionsRepo, createTenantLeaseRepo } from "../../api/shared";
import { requireDashboardSectionAccess } from "../../../lib/dashboard-access";

export default async function LeasesPage(): Promise<React.ReactElement> {
  const { session } = await requireDashboardSectionAccess("operations");

  const tenantRepo = createTenantLeaseRepo();
  const teamFunctionsRepo = createTeamFunctionsRepo();

  const result = await listLeases(
    { session, organizationId: session.organizationId ?? "" },
    { repository: tenantRepo, teamFunctionsRepository: teamFunctionsRepo }
  );

  const scopedPortfolio = await getScopedPortfolioData(session);

  const leases: LeaseWithTenantView[] = result.body.success
    ? filterLeasesByScope(result.body.data.leases, scopedPortfolio)
    : [];

  return <LeaseManagementPanel leases={leases} />;
}

