import { redirect } from "next/navigation";
import { createRepositoryFromEnv } from "../../api/shared";
import OrganizationSettingsForm from "../../../components/organization-settings-form";
import { canEditOrganizationDetails } from "../../../lib/operator-context";
import { getServerAuthSession } from "../../../lib/session";

export default async function OrganizationSettingsPage(): Promise<React.ReactElement> {
  const session = await getServerAuthSession();
  if (!session) {
    redirect("/login");
  }

  if (!canEditOrganizationDetails(session)) {
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
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#010a19]">Organisation</h1>
        <p className="mt-1 text-sm text-gray-500">
          Completez les details de votre agence, ajoutez votre logo et reutilisez ces informations dans vos emails et invitations.
        </p>
      </div>
      <OrganizationSettingsForm organization={organization} />
    </div>
  );
}
