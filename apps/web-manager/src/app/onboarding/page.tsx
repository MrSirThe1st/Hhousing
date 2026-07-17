import { redirect } from "next/navigation";
import type { PlatformExperience } from "@hhousing/domain";
import OnboardingSetupWizard from "../../components/onboarding-setup-wizard";
import { createRepositoryFromEnv, createTenantLeaseRepo } from "../api/shared";
import { getServerOperatorContext } from "../../lib/operator-context";
import { getServerAuthSession } from "../../lib/session";

type OnboardingPageProps = {
  searchParams: Promise<{
    flow?: string;
  }>;
};

function resolveExperience(
  flowParam: string | undefined,
  contextExperience: PlatformExperience
): PlatformExperience {
  if (flowParam === "individual" || flowParam === "entreprise") {
    return flowParam;
  }
  return contextExperience;
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps): Promise<React.ReactElement> {
  const session = await getServerAuthSession();
  if (!session) {
    redirect("/login");
  }

  const params = await searchParams;
  const operatorContext = await getServerOperatorContext(session);
  const experience = resolveExperience(params?.flow, operatorContext.experience);

  const propertyRepo = createRepositoryFromEnv();
  const tenantLeaseRepo = createTenantLeaseRepo();

  let propertyCount = 0;
  let firstPropertyId: string | null = null;
  let tenantCount = 0;
  let firstTenantId: string | null = null;
  let leaseCount = 0;

  if (propertyRepo.success) {
    const properties = await propertyRepo.data.listPropertiesWithUnits(session.organizationId);
    propertyCount = properties.length;
    firstPropertyId = properties[0]?.property.id ?? null;
  }

  const tenants = await tenantLeaseRepo.listTenantsByOrganization(session.organizationId);
  tenantCount = tenants.length;
  firstTenantId = tenants[0]?.id ?? null;

  const leases = await tenantLeaseRepo.listLeasesByOrganization(session.organizationId);
  leaseCount = leases.length;

  return (
    <OnboardingSetupWizard
      experience={experience}
      progress={{ propertyCount, tenantCount, leaseCount }}
      firstPropertyId={firstPropertyId}
      firstTenantId={firstTenantId}
    />
  );
}
