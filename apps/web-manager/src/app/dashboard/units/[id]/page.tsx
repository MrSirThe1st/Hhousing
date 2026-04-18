import Link from "next/link";
import { getScopedPortfolioData } from "../../../../lib/operator-scope-portfolio";
import { requireDashboardSectionAccess } from "../../../../lib/dashboard-access";
import UnitDetailClient from "./unit-detail-client";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function UnitDetailPage({ params }: PageProps): Promise<React.ReactElement> {
  const { id } = await params;
  const { session } = await requireDashboardSectionAccess("operations");
  const scoped = await getScopedPortfolioData(session);
  const propertyRecord = scoped.properties.find((item) => item.units.some((unit) => unit.id === id));
  const unit = propertyRecord?.units.find((entry) => entry.id === id) ?? null;

  if (!unit) {
    return (
      <div className="p-8">
        <p className="text-gray-600">Unité introuvable</p>
        <Link href="/dashboard/properties" className="mt-4 inline-block text-[#0063fe] hover:underline">
          Retour au portfolio
        </Link>
      </div>
    );
  }

  return <UnitDetailClient id={id} initialUnit={unit} initialProperty={propertyRecord?.property ?? null} />;
}
