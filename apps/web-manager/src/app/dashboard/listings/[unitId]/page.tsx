import { notFound } from "next/navigation";
import type { ManagerListingView } from "@hhousing/api-contracts";
import ListingEditorForm from "../../../../components/listing-editor-form";
import DashboardPageLoadError from "../../../../components/dashboard-page-load-error";
import { createListingRepo } from "../../../api/shared";
import { requireDashboardSectionAccess } from "../../../../lib/dashboard-access";

type ListingEditorPageProps = {
  params: Promise<{ unitId: string }>;
};

export default async function ListingEditorPage({ params }: ListingEditorPageProps): Promise<React.ReactElement> {
  const { session } = await requireDashboardSectionAccess("operations");

  const { unitId } = await params;
  const listingRepo = createListingRepo();

  let listings: ManagerListingView[] = [];
  try {
    listings = (await listingRepo.listManagerListings(session.organizationId)) as ManagerListingView[];
  } catch (error) {
    console.error("Failed to load listing editor", error);
    return (
      <DashboardPageLoadError message="Impossible de charger l'annonce pour le moment. Réessayez dans un instant." />
    );
  }

  const item = listings.find((entry) => entry.unit.id === unitId);

  if (!item) {
    notFound();
  }

  return (
    <ListingEditorForm
      organizationId={session.organizationId}
      currentScopeLabel="Tous mes biens"
      item={item}
      allManagerListings={listings}
    />
  );
}
