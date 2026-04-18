import { redirect } from "next/navigation";
import type { PropertyWithUnitsView } from "@hhousing/api-contracts";
import { listProperties } from "../../../../api";
import { createRepositoryFromEnv, createTeamFunctionsRepo } from "../../../api/shared";
import UnitCreateForm from "../../../../components/unit-create-form";
import { requireDashboardSectionAccess } from "../../../../lib/dashboard-access";

export default async function AddUnitPage(): Promise<React.ReactElement> {
  const { session } = await requireDashboardSectionAccess("operations");

  const repoResult = createRepositoryFromEnv();

  if (!repoResult.success) {
    return <div className="p-8 text-red-600">Erreur de connexion à la base de données.</div>;
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
    <UnitCreateForm
      organizationId={session.organizationId ?? ""}
      currentScopeLabel="Portefeuille unifié"
      items={items}
    />
  );
}