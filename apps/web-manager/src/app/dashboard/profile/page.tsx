import OperatorProfilePanel from "../../../components/operator-profile-panel";
import { getServerAuthSession } from "../../../lib/session";
import { redirect } from "next/navigation";
import { createRepositoryFromEnv } from "../../api/shared";
import { resolveDashboardAccess } from "../../../lib/dashboard-access";
import type { Organization } from "@hhousing/domain";

export default async function DashboardProfilePage(): Promise<React.ReactElement> {
  const session = await getServerAuthSession();
  if (!session) {
    redirect("/login");
  }

  if (session.role === "tenant") {
    redirect("/account-type");
  }

  const repoResult = createRepositoryFromEnv();
  let organization: Organization | null = null;
  if (repoResult.success) {
    organization = await repoResult.data.getOrganizationById(session.organizationId);
  }

  const access = await resolveDashboardAccess(session);
  const canEditOrganization = access.manageOrganization;

  return (
    <div className="p-8">
      <OperatorProfilePanel
        role={session.role}
        organization={organization}
        canEditOrganization={canEditOrganization}
      />
    </div>
  );
}
