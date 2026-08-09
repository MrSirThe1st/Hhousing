import type { Owner } from "@hhousing/domain";
import { createRepositoryFromEnv } from "../../../api/shared";
import PropertyCreateForm from "../../../../components/property-create-form";
import DashboardPageLoadError from "../../../../components/dashboard-page-load-error";
import { requireDashboardSectionAccess } from "../../../../lib/dashboard-access";
import { getIndividualExperienceFeatures } from "../../../../lib/individual-experience";
import { getServerOperatorContext } from "../../../../lib/operator-context";

type AddPropertyPageProps = {
  searchParams?: Promise<{
    from?: string;
  }>;
};

export default async function AddPropertyPage({ searchParams }: AddPropertyPageProps): Promise<React.ReactElement> {
  const { session } = await requireDashboardSectionAccess("operations");
  const operatorContext = await getServerOperatorContext(session);
  const features = getIndividualExperienceFeatures(operatorContext.experience);
  const params = await searchParams;

  const repoResult = createRepositoryFromEnv();

  if (!repoResult.success) {
    return <div className="p-8 text-red-600">Erreur de connexion à la base de données.</div>;
  }

  let filteredOwners: Owner[] = [];
  try {
    const owners = await repoResult.data.listOwners(session.organizationId ?? "");
    filteredOwners = features.managedPropertyMode
      ? owners
      : owners.filter((owner) => owner.ownerType === "organization");
  } catch (error) {
    console.error("Failed to load property create options", error);
    return (
      <DashboardPageLoadError message="Impossible de charger le formulaire bien. Réessayez dans un instant." />
    );
  }

  return (
    <PropertyCreateForm
      organizationId={session.organizationId ?? ""}
      owners={filteredOwners}
      managedPropertyMode={features.managedPropertyMode}
      fromOnboarding={params?.from === "onboarding"}
    />
  );
}
