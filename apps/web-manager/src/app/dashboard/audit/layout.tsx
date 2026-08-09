import { requireEntrepriseExperience } from "../../../lib/entreprise-experience-guard";
import { redirectIfV1FeatureDeferred } from "../../../lib/v1-deferred-feature-guard";

export default async function AuditEntrepriseLayout({
  children
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  await requireEntrepriseExperience();
  redirectIfV1FeatureDeferred("audit");
  return <>{children}</>;
}
