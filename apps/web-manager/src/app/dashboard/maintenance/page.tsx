import { redirect } from "next/navigation";
import type { MaintenanceRequest } from "@hhousing/domain";
import { listMaintenanceRequests } from "../../../api";
import {
  filterMaintenanceRequestsByScope,
  getScopedPortfolioData
} from "../../../lib/operator-scope-portfolio";
import { createMaintenanceRepo, createTeamFunctionsRepo } from "../../api/shared";
import { getServerAuthSession } from "../../../lib/session";
import MaintenanceManagementPanel from "../../../components/maintenance-management-panel";

export default async function MaintenancePage(): Promise<React.ReactElement> {
  const session = await getServerAuthSession();
  if (!session) redirect("/login");

  const maintenanceRepo = createMaintenanceRepo();
  const teamFunctionsRepo = createTeamFunctionsRepo();

  const requestsResult = await listMaintenanceRequests(
    { session, organizationId: session.organizationId ?? "", unitId: null, status: null },
    { repository: maintenanceRepo, teamFunctionsRepository: teamFunctionsRepo }
  );

  const scopedPortfolio = await getScopedPortfolioData(session);

  const requests: MaintenanceRequest[] = requestsResult.body.success
    ? filterMaintenanceRequestsByScope(requestsResult.body.data.requests, scopedPortfolio)
    : [];

  return (
    <MaintenanceManagementPanel
      requests={requests}
    />
  );
}

