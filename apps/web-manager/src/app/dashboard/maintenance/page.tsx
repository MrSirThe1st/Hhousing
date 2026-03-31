import { redirect } from "next/navigation";
import type { MaintenanceRequest } from "@hhousing/domain";
import { listMaintenanceRequests } from "../../../api";
import { createMaintenanceRepo } from "../../api/shared";
import { getServerAuthSession } from "../../../lib/session";
import MaintenanceManagementPanel from "../../../components/maintenance-management-panel";

export default async function MaintenancePage(): Promise<React.ReactElement> {
  const session = await getServerAuthSession();
  if (!session) redirect("/login");

  const maintenanceRepo = createMaintenanceRepo();

  const requestsResult = await listMaintenanceRequests(
    { session, organizationId: session.organizationId ?? "", unitId: null, status: null },
    { repository: maintenanceRepo }
  );

  const requests: MaintenanceRequest[] = requestsResult.body.success ? requestsResult.body.data.requests : [];

  return (
    <MaintenanceManagementPanel
      requests={requests}
    />
  );
}

