import type { PropertyWithUnitsView } from "@hhousing/api-contracts";
import { listProperties } from "../../../../api";
import { createRepositoryFromEnv, createTeamFunctionsRepo } from "../../../api/shared";
import UnitCreateForm from "../../../../components/unit-create-form";
import DashboardPageLoadError from "../../../../components/dashboard-page-load-error";
import { requireDashboardSectionAccess } from "../../../../lib/dashboard-access";

export default async function AddUnitPage(): Promise<React.ReactElement> {
  const { session } = await requireDashboardSectionAccess("operations");

  const repoResult = createRepositoryFromEnv();

  if (!repoResult.success) {
    return <div className="p-8 text-red-600">Erreur de connexion à la base de données.</div>;
  }

  let items: PropertyWithUnitsView[] = [];
  let loadError: string | null = null;

  try {
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
    items = result.body.success ? result.body.data.items : [];
  } catch (error) {
    console.error("Failed to load unit create options", error);
    loadError = "Impossible de charger les biens pour le moment. Réessayez dans un instant.";
  }

  if (loadError) {
    return <DashboardPageLoadError message={loadError} />;
  }

  return (
    <UnitCreateForm
      organizationId={session.organizationId ?? ""}
      currentScopeLabel="Tous mes biens"
      items={items}
    />
  );
}
