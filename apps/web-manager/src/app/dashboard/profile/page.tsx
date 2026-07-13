import Link from "next/link";
import { redirect } from "next/navigation";
import OperatorProfilePanel from "../../../components/operator-profile-panel";
import OrganizationSettingsForm from "../../../components/organization-settings-form";
import PlatformExperienceSettings from "../../../components/platform-experience-settings";
import { isAccountOwner, getServerOperatorContext } from "../../../lib/operator-context";
import { isIndividualExperience } from "../../../lib/platform-experience";
import { resolveDashboardAccess } from "../../../lib/dashboard-access";
import { getServerAuthSession } from "../../../lib/session";
import { createRepositoryFromEnv } from "../../api/shared";
import type { Organization } from "@hhousing/domain";

export default async function DashboardProfilePage(): Promise<React.ReactElement> {
  const session = await getServerAuthSession();
  if (!session) {
    redirect("/login");
  }

  if (session.role === "tenant") {
    redirect("/account-type");
  }

  const repoResult = createRepositoryFromEnv();
  let organization: Organization | null = null;
  if (repoResult.success) {
    organization = await repoResult.data.getOrganizationById(session.organizationId);
  }

  const access = await resolveDashboardAccess(session);
  const operatorContext = await getServerOperatorContext(session);
  const isIndividual = isIndividualExperience(operatorContext.experience);
  const canEditOrganization = await isAccountOwner(session);

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-8">
      <OperatorProfilePanel role={session.role} organization={organization} />

      {isIndividual && organization ? (
        <>
          <PlatformExperienceSettings
            initialExperience={organization.platformExperience}
            canEdit={canEditOrganization}
          />
          <OrganizationSettingsForm organization={organization} canEdit={canEditOrganization} />
        </>
      ) : access.manageOrganization ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-[#010a19]">Paramètres organisation</h2>
          <p className="mt-1 text-sm text-slate-500">
            Logo, contacts, informations légales et expérience plateforme sont gérés sur la page dédiée à l&apos;organisation.
          </p>
          <Link
            href="/dashboard/organization"
            className="mt-4 inline-flex items-center text-sm font-semibold text-[#0063fe] hover:underline"
          >
            Ouvrir les paramètres organisation →
          </Link>
        </section>
      ) : null}
    </div>
  );
}
