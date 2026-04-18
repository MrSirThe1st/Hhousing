import { redirect } from "next/navigation";
import type { PropertyWithUnitsView } from "@hhousing/api-contracts";
import type { Tenant } from "@hhousing/domain";
import { listProperties } from "../../../../api";
import { createListingRepo, createRepositoryFromEnv, createTeamFunctionsRepo, createTenantLeaseRepo } from "../../../api/shared";
import LeaseMoveInForm from "../../../../components/lease-move-in-form";
import { requireDashboardSectionAccess } from "../../../../lib/dashboard-access";

type LeaseMoveInPageProps = {
  searchParams?: Promise<{
    tenantId?: string;
    propertyId?: string;
    unitId?: string;
    applicationId?: string;
  }>;
};

export default async function LeaseMoveInPage({ searchParams }: LeaseMoveInPageProps): Promise<React.ReactElement> {
  const { session } = await requireDashboardSectionAccess("operations");
  const params = await searchParams;

  const propertyRepoResult = createRepositoryFromEnv();

  if (!propertyRepoResult.success) {
    return <div className="p-8 text-red-600">Erreur de connexion à la base de données.</div>;
  }

  const propertiesResult = await listProperties(
    {
      session,
      organizationId: session.organizationId ?? ""
    },
    {
      repository: propertyRepoResult.data,
      teamFunctionsRepository: createTeamFunctionsRepo()
    }
  );

  const items: PropertyWithUnitsView[] = propertiesResult.body.success ? propertiesResult.body.data.items : [];
  const tenants: Tenant[] = await createTenantLeaseRepo().listTenantsByOrganization(session.organizationId ?? "");
  const applicationView = params?.applicationId
    ? await createListingRepo().getApplicationById(params.applicationId, session.organizationId ?? "")
    : null;

  return (
    <LeaseMoveInForm
      organizationId={session.organizationId ?? ""}
      items={items}
      tenants={tenants}
      initialApplicationId={params?.applicationId}
      initialPropertyId={params?.propertyId ?? applicationView?.property.id}
      initialTenantId={params?.tenantId}
      initialUnitId={params?.unitId ?? applicationView?.unit.id}
    />
  );
}