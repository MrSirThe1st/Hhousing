import { redirect } from "next/navigation";
import { createRepositoryFromEnv } from "../../api/shared";
import LogoutButton from "../../../components/logout-button";
import OrganizationSettingsForm from "../../../components/organization-settings-form";
import { requireDashboardSectionAccess } from "../../../lib/dashboard-access";

export default async function OrganizationSettingsPage(): Promise<React.ReactElement> {
  const { session, access } = await requireDashboardSectionAccess("organization");

  if (!access.manageOrganization) {
    redirect("/dashboard");
  }

  const repositoryResult = createRepositoryFromEnv();
  if (!repositoryResult.success) {
    throw new Error(repositoryResult.error);
  }

  const organization = await repositoryResult.data.getOrganizationById(session.organizationId);
  if (!organization) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#010a19]">Organisation</h1>
          <p className="mt-2 text-sm text-slate-500">
            Details de votre agence, logo et informations reutilisables.
          </p>
        </div>
        <LogoutButton />
      </div>
      <OrganizationSettingsForm organization={organization} />
    </div>
  );
}
