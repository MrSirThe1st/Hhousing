import { Suspense } from "react";
import PrestatairesParBienPanel from "../../../components/prestataires-par-bien-panel";
import { loadPrestatairesPageData } from "../../../lib/prestataires-page-data";

export default async function PrestatairesParBienPage({
  searchParams
}: {
  searchParams: Promise<{ propertyId?: string }>;
}): Promise<React.ReactElement> {
  const params = await searchParams;
  const data = await loadPrestatairesPageData();

  return (
    <Suspense fallback={null}>
      <PrestatairesParBienPanel
        platformProviders={data.platformProviders}
        orgProviders={data.orgProviders}
        assignments={data.assignments}
        properties={data.properties}
        writable={data.writable}
        initialPropertyId={params.propertyId}
      />
    </Suspense>
  );
}
