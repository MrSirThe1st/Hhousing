import { Suspense } from "react";
import PrestatairesMesPanel from "../../../../components/prestataires-mes-panel";
import { loadPrestatairesPageData } from "../../../../lib/prestataires-page-data";

export default async function PrestatairesMesPage({
  searchParams
}: {
  searchParams: Promise<{ propertyId?: string }>;
}): Promise<React.ReactElement> {
  const params = await searchParams;
  const data = await loadPrestatairesPageData();

  return (
    <Suspense fallback={null}>
      <PrestatairesMesPanel
        categories={data.categories}
        orgProviders={data.orgProviders}
        assignments={data.assignments}
        properties={data.properties}
        writable={data.writable}
        initialPropertyId={params.propertyId}
      />
    </Suspense>
  );
}
