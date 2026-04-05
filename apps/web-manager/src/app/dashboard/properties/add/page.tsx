import { redirect } from "next/navigation";
import type { OwnerClient } from "@hhousing/domain";
import { createRepositoryFromEnv } from "../../../api/shared";
import PropertyCreateForm from "../../../../components/property-create-form";
import { getOperatorScopeLabel, getServerOperatorContext } from "../../../../lib/operator-context";
import { getServerAuthSession } from "../../../../lib/session";

export default async function AddPropertyPage(): Promise<React.ReactElement> {
  const session = await getServerAuthSession();
  if (!session) redirect("/login");

  const operatorContext = await getServerOperatorContext(session);
  const repoResult = createRepositoryFromEnv();

  if (!repoResult.success) {
    return <div className="p-8 text-red-600">Erreur de connexion à la base de données.</div>;
  }

  const ownerClients: OwnerClient[] = await repoResult.data.listOwnerClients(session.organizationId ?? "");

  return (
    <PropertyCreateForm
      organizationId={session.organizationId ?? ""}
      currentScope={operatorContext.currentScope}
      currentScopeLabel={getOperatorScopeLabel(operatorContext.currentScope)}
      ownerClients={ownerClients}
    />
  );
}