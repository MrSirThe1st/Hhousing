import { redirect } from "next/navigation";
import type { LeaseWithTenantView } from "@hhousing/api-contracts";
import { listLeases } from "../../../api";
import LeaseManagementPanel from "../../../components/lease-management-panel";
import { createTeamFunctionsRepo, createTenantLeaseRepo } from "../../api/shared";
import { getServerAuthSession } from "../../../lib/session";

export default async function LeasesPage(): Promise<React.ReactElement> {
  const session = await getServerAuthSession();
  if (!session) redirect("/login");

  const tenantRepo = createTenantLeaseRepo();
  const teamFunctionsRepo = createTeamFunctionsRepo();

  const result = await listLeases(
    { session, organizationId: session.organizationId ?? "" },
    { repository: tenantRepo, teamFunctionsRepository: teamFunctionsRepo }
  );

  const leases: LeaseWithTenantView[] = result.body.success ? result.body.data.leases : [];

  return <LeaseManagementPanel leases={leases} />;
}

