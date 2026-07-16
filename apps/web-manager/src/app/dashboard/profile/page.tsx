import { Suspense } from "react";
import { redirect } from "next/navigation";
import ProfileSettingsView from "../../../components/profile-settings-view";
import { isAccountOwner } from "../../../lib/operator-context";
import { getServerAuthSession } from "../../../lib/session";
import { createRepositoryFromEnv } from "../../api/shared";
import type { Organization } from "@hhousing/domain";

type ProfilePageProps = {
  searchParams?: Promise<{
    tab?: string;
  }>;
};

export default async function DashboardProfilePage({
  searchParams
}: ProfilePageProps): Promise<React.ReactElement> {
  const session = await getServerAuthSession();
  if (!session) {
    redirect("/login");
  }

  if (session.role === "tenant") {
    redirect("/account-type");
  }

  const params = await searchParams;
  const initialTab = params?.tab === "organisation" || params?.tab === "company" || params?.tab === "espace"
    ? "organisation"
    : "compte";

  const repoResult = createRepositoryFromEnv();
  let organization: Organization | null = null;
  if (repoResult.success) {
    organization = await repoResult.data.getOrganizationById(session.organizationId);
  }

  const canEditOrganization = await isAccountOwner(session);

  return (
    <div className="p-8">
      <Suspense fallback={<div className="text-sm text-slate-500">Chargement des paramètres…</div>}>
        <ProfileSettingsView
          role={session.role}
          organization={organization}
          canEditOrganization={canEditOrganization}
          initialTab={initialTab}
        />
      </Suspense>
    </div>
  );
}
