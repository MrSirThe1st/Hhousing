import { redirect } from "next/navigation";
import type { Owner } from "@hhousing/domain";
import { createRepositoryFromEnv } from "../../../api/shared";
import PropertyCreateForm from "../../../../components/property-create-form";
import { requireDashboardSectionAccess } from "../../../../lib/dashboard-access";
import { getIndividualExperienceFeatures } from "../../../../lib/individual-experience";
import { getServerOperatorContext } from "../../../../lib/operator-context";

export default async function AddPropertyPage(): Promise<React.ReactElement> {
  const { session } = await requireDashboardSectionAccess("operations");
  const operatorContext = await getServerOperatorContext(session);
  const features = getIndividualExperienceFeatures(operatorContext.experience);

  const repoResult = createRepositoryFromEnv();

  if (!repoResult.success) {
    return <div className="p-8 text-red-600">Erreur de connexion à la base de données.</div>;
  }

  const owners: Owner[] = await repoResult.data.listOwners(session.organizationId ?? "");
  const filteredOwners = features.managedPropertyMode
    ? owners
    : owners.filter((owner) => owner.ownerType === "organization");

  return (
    <PropertyCreateForm
      organizationId={session.organizationId ?? ""}
      owners={filteredOwners}
    />
  );
}