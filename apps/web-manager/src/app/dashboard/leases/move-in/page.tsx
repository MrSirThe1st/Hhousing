import { redirect } from "next/navigation";
import type { PropertyWithUnitsView } from "@hhousing/api-contracts";
import type { Tenant } from "@hhousing/domain";
import { listProperties } from "../../../../api";
import { createRepositoryFromEnv, createTenantLeaseRepo } from "../../../api/shared";
import LeaseMoveInForm from "../../../../components/lease-move-in-form";
import { getServerOperatorContext } from "../../../../lib/operator-context";
import { getServerAuthSession } from "../../../../lib/session";

export default async function LeaseMoveInPage(): Promise<React.ReactElement> {
  const session = await getServerAuthSession();
  if (!session) redirect("/login");

  const operatorContext = await getServerOperatorContext(session);
  const propertyRepoResult = createRepositoryFromEnv();

  if (!propertyRepoResult.success) {
    return <div className="p-8 text-red-600">Erreur de connexion à la base de données.</div>;
  }

  const propertiesResult = await listProperties(
    {
      session,
      organizationId: session.organizationId ?? "",
      filter: { managementContext: operatorContext.currentScope }
    },
    { repository: propertyRepoResult.data }
  );

  const items: PropertyWithUnitsView[] = propertiesResult.body.success ? propertiesResult.body.data.items : [];
  const tenants: Tenant[] = await createTenantLeaseRepo().listTenantsByOrganization(session.organizationId ?? "");

  return (
    <LeaseMoveInForm
      organizationId={session.organizationId ?? ""}
      items={items}
      tenants={tenants}
    />
  );
}