import { requireEntrepriseExperience } from "../../../../../lib/entreprise-experience-guard";

export default async function LeaseMoveOutEntrepriseLayout({
  children
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  await requireEntrepriseExperience();
  return <>{children}</>;
}
