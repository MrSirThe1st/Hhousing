import { redirect } from "next/navigation";
import type { PropertyWithUnitsView } from "@hhousing/api-contracts";
import { listProperties } from "../../../../api";
import { createRepositoryFromEnv } from "../../../api/shared";
import UnitCreateForm from "../../../../components/unit-create-form";
import { getOperatorScopeLabel, getServerOperatorContext } from "../../../../lib/operator-context";
import { getServerAuthSession } from "../../../../lib/session";

export default async function AddUnitPage(): Promise<React.ReactElement> {
  const session = await getServerAuthSession();
  if (!session) redirect("/login");

  const operatorContext = await getServerOperatorContext(session);
  const repoResult = createRepositoryFromEnv();

  if (!repoResult.success) {
    return <div className="p-8 text-red-600">Erreur de connexion à la base de données.</div>;
  }

  const result = await listProperties(
    {
      session,
      organizationId: session.organizationId ?? "",
      filter: { managementContext: operatorContext.currentScope }
    },
    { repository: repoResult.data }
  );

  const items: PropertyWithUnitsView[] = result.body.success ? result.body.data.items : [];

  return (
    <UnitCreateForm
      organizationId={session.organizationId ?? ""}
      currentScopeLabel={getOperatorScopeLabel(operatorContext.currentScope)}
      items={items}
    />
  );
}