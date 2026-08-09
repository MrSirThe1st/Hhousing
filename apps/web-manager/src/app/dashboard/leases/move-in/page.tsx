import type { PropertyWithUnitsView } from "@hhousing/api-contracts";
import type { Tenant } from "@hhousing/domain";
import { listProperties } from "../../../../api";
import { createListingRepo, createRepositoryFromEnv, createTeamFunctionsRepo, createTenantLeaseRepo } from "../../../api/shared";
import LeaseMoveInForm from "../../../../components/lease-move-in-form";
import DashboardPageLoadError from "../../../../components/dashboard-page-load-error";
import { requireDashboardSectionAccess } from "../../../../lib/dashboard-access";

type LeaseMoveInPageProps = {
  searchParams?: Promise<{
    tenantId?: string;
    propertyId?: string;
    unitId?: string;
    applicationId?: string;
    from?: string;
  }>;
};

export default async function LeaseMoveInPage({ searchParams }: LeaseMoveInPageProps): Promise<React.ReactElement> {
  const { session } = await requireDashboardSectionAccess("operations");
  const params = await searchParams;

  const propertyRepoResult = createRepositoryFromEnv();

  if (!propertyRepoResult.success) {
    return <div className="p-8 text-red-600">Erreur de connexion à la base de données.</div>;
  }

  let items: PropertyWithUnitsView[] = [];
  let tenants: Tenant[] = [];
  let applicationView: Awaited<ReturnType<ReturnType<typeof createListingRepo>["getApplicationById"]>> = null;
  let loadError: string | null = null;

  try {
    // Wave properties first (largest); tenants second to limit pooler fan-out.
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
    items = propertiesResult.body.success ? propertiesResult.body.data.items : [];

    tenants = await createTenantLeaseRepo().listTenantsByOrganization(session.organizationId ?? "");

    if (params?.applicationId) {
      applicationView = await createListingRepo().getApplicationById(
        params.applicationId,
        session.organizationId ?? ""
      );
    }
  } catch (error) {
    console.error("Failed to load lease move-in workspace", error);
    loadError = "Impossible de charger le formulaire d'entrée en location. Réessayez dans un instant.";
  }

  if (loadError) {
    return <DashboardPageLoadError message={loadError} />;
  }

  return (
    <LeaseMoveInForm
      organizationId={session.organizationId ?? ""}
      items={items}
      tenants={tenants}
      initialApplicationId={params?.applicationId}
      initialPropertyId={params?.propertyId ?? applicationView?.property.id}
      initialTenantId={params?.tenantId}
      initialUnitId={params?.unitId ?? applicationView?.unit.id}
      fromOnboarding={params?.from === "onboarding"}
    />
  );
}
