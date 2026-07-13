import { requireEntrepriseExperience } from "../../../lib/entreprise-experience-guard";

export default async function ExpensesEntrepriseLayout({
  children
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  await requireEntrepriseExperience();
  return <>{children}</>;
}
