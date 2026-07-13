import { redirect } from "next/navigation";
import { createRepositoryFromEnv } from "../../api/shared";
import OrganizationSettingsForm from "../../../components/organization-settings-form";
import PlatformExperienceSettings from "../../../components/platform-experience-settings";
import { requireDashboardSectionAccess } from "../../../lib/dashboard-access";
import { isAccountOwner, getServerOperatorContext } from "../../../lib/operator-context";
import { isIndividualExperience } from "../../../lib/platform-experience";

export default async function OrganizationSettingsPage(): Promise<React.ReactElement> {
  const { session, access } = await requireDashboardSectionAccess("organization");

  if (!access.organization) {
    redirect("/dashboard");
  }

  const operatorContext = await getServerOperatorContext(session);
  if (isIndividualExperience(operatorContext.experience)) {
    redirect("/dashboard/profile");
  }

  const canEditPlatformExperience = await isAccountOwner(session);

  const repositoryResult = createRepositoryFromEnv();
  if (!repositoryResult.success) {
    throw new Error(repositoryResult.error);
  }

  const organization = await repositoryResult.data.getOrganizationById(session.organizationId);
  if (!organization) {
    redirect("/dashboard");
  }

  const canEditOrganization = canEditPlatformExperience;

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#010a19]">Organisation</h1>
          <p className="mt-2 text-sm text-slate-500">
            Détails de votre agence, logo et informations réutilisables dans les communications.
          </p>
        </div>
      </div>

      <PlatformExperienceSettings
        initialExperience={organization.platformExperience}
        canEdit={canEditPlatformExperience}
      />

      <OrganizationSettingsForm
        organization={organization}
        canEdit={canEditOrganization}
      />
    </div>
  );
}
