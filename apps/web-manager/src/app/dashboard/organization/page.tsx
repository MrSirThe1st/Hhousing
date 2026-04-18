import { redirect } from "next/navigation";
import { createRepositoryFromEnv } from "../../api/shared";
import { createAuthRepositoryFromEnv } from "@hhousing/data-access";
import OrganizationSettingsForm from "../../../components/organization-settings-form";
import { requireDashboardSectionAccess } from "../../../lib/dashboard-access";

export default async function OrganizationSettingsPage(): Promise<React.ReactElement> {
  const { session, access } = await requireDashboardSectionAccess("organization");

  if (!access.organization) {
    redirect("/dashboard");
  }

  const authRepository = createAuthRepositoryFromEnv(process.env);
  const operatorMemberships = (await authRepository.listMembershipsByOrganization(session.organizationId))
    .filter((membership) => membership.role === "landlord" || membership.role === "property_manager")
    .sort(
      (left, right) =>
        new Date(left.createdAtIso).getTime() - new Date(right.createdAtIso).getTime()
    );
  const accountOwnerMembership = operatorMemberships[0] ?? null;
  const currentMembership = session.memberships.find(
    (membership) => membership.organizationId === session.organizationId
  );
  const canEditOrganization =
    currentMembership !== undefined && accountOwnerMembership?.id === currentMembership.id;

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
      </div>
      <OrganizationSettingsForm organization={organization} canEdit={canEditOrganization} />
    </div>
  );
}
