import { requireEntrepriseExperience } from "../../../lib/entreprise-experience-guard";
import { redirectIfV1FeatureDeferred } from "../../../lib/v1-deferred-feature-guard";

export default async function ExpensesEntrepriseLayout({
  children
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  await requireEntrepriseExperience();
  redirectIfV1FeatureDeferred("expenses");
  return <>{children}</>;
}
