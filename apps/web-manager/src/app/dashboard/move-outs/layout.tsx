import { requireEntrepriseExperience } from "../../../lib/entreprise-experience-guard";

export default async function MoveOutsEntrepriseLayout({
  children
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  await requireEntrepriseExperience();
  return <>{children}</>;
}
