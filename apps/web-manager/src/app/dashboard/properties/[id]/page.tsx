import Link from "next/link";
import { createRepositoryFromEnv } from "../../../api/shared";
import { getScopedPortfolioData } from "../../../../lib/operator-scope-portfolio";
import { requireDashboardSectionAccess } from "../../../../lib/dashboard-access";
import PropertyDetailClient from "./property-detail-client";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PropertyDetailPage({ params }: PageProps): Promise<React.ReactElement> {
  const { id } = await params;
  const { session } = await requireDashboardSectionAccess("operations");
  const repositoryResult = createRepositoryFromEnv();

  if (!repositoryResult.success) {
    return <div className="p-8 text-red-600">Erreur de connexion à la base de données.</div>;
  }

  const scoped = await getScopedPortfolioData(session);
  const propertyRecord = scoped.properties.find((item) => item.property.id === id);

  if (!propertyRecord) {
    return (
      <div className="p-8">
        <p className="text-gray-600">Propriété introuvable</p>
        <Link href="/dashboard/properties" className="mt-4 inline-block text-[#0063fe] hover:underline">
          Retour au portfolio
        </Link>
      </div>
    );
  }

  const ownerClients = await repositoryResult.data.listOwnerClients(session.organizationId);

  return <PropertyDetailClient id={id} initialProperty={propertyRecord.property} initialOwnerClients={ownerClients} initialUnits={propertyRecord.units} />;
}
