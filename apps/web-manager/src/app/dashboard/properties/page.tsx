import { redirect } from "next/navigation";
import type { PropertyWithUnitsView } from "@hhousing/api-contracts";
import { listProperties } from "../../../api";
import { createRepositoryFromEnv, createTeamFunctionsRepo } from "../../api/shared";
import ReadOnlyBanner from "../../../components/read-only-banner";
import { requireDashboardSectionAccess } from "../../../lib/dashboard-access";
import PropertyManagementPanel from "../../../components/property-management-panel";

export default async function PropertiesPage(): Promise<React.ReactElement> {
  const { session, access } = await requireDashboardSectionAccess("operations");

  const repoResult = createRepositoryFromEnv();
  if (!repoResult.success) {
    return (
      <div className="p-8 text-red-600">Erreur de connexion à la base de données.</div>
    );
  }

  const result = await listProperties(
    {
      session,
      organizationId: session.organizationId ?? ""
    },
    {
      repository: repoResult.data,
      teamFunctionsRepository: createTeamFunctionsRepo()
    }
  );

  const items: PropertyWithUnitsView[] = result.body.success ? result.body.data.items : [];

  return (
    <>
      {!access.operationsWritable && <ReadOnlyBanner />}
      <PropertyManagementPanel
        organizationId={session.organizationId ?? ""}
        items={items}
      />
    </>
  );
}

