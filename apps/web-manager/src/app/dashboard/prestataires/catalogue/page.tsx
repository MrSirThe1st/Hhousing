import { Suspense } from "react";
import PrestatairesCataloguePanel from "../../../../components/prestataires-catalogue-panel";
import { loadPrestatairesPageData } from "../../../../lib/prestataires-page-data";

export default async function PrestatairesCataloguePage({
  searchParams
}: {
  searchParams: Promise<{ propertyId?: string }>;
}): Promise<React.ReactElement> {
  const params = await searchParams;
  const data = await loadPrestatairesPageData();

  return (
    <Suspense fallback={null}>
      <PrestatairesCataloguePanel
        platformProviders={data.platformProviders}
        assignments={data.assignments}
        properties={data.properties}
        writable={data.writable}
        initialPropertyId={params.propertyId}
      />
    </Suspense>
  );
}
