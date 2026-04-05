import { redirect } from "next/navigation";
import type { PropertyWithUnitsView } from "@hhousing/api-contracts";
import { listProperties } from "../../../api";
import { createRepositoryFromEnv } from "../../api/shared";
import { getOperatorScopeLabel, getServerOperatorContext } from "../../../lib/operator-context";
import { getServerAuthSession } from "../../../lib/session";
import PropertyManagementPanel from "../../../components/property-management-panel";

export default async function PropertiesPage(): Promise<React.ReactElement> {
  const session = await getServerAuthSession();
  if (!session) redirect("/login");
  const operatorContext = await getServerOperatorContext(session);

  const repoResult = createRepositoryFromEnv();
  if (!repoResult.success) {
    return (
      <div className="p-8 text-red-600">Erreur de connexion à la base de données.</div>
    );
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
    <PropertyManagementPanel
      organizationId={session.organizationId ?? ""}
      currentScope={operatorContext.currentScope}
      currentScopeLabel={getOperatorScopeLabel(operatorContext.currentScope)}
      items={items}
    />
  );
}

