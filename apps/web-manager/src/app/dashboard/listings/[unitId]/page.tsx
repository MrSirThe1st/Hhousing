import { notFound, redirect } from "next/navigation";
import type { ManagerListingView } from "@hhousing/api-contracts";
import ListingEditorForm from "../../../../components/listing-editor-form";
import { createListingRepo } from "../../../api/shared";
import { requireDashboardSectionAccess } from "../../../../lib/dashboard-access";

type ListingEditorPageProps = {
  params: Promise<{ unitId: string }>;
};

export default async function ListingEditorPage({ params }: ListingEditorPageProps): Promise<React.ReactElement> {
  const { session } = await requireDashboardSectionAccess("operations");

  const { unitId } = await params;
  const listingRepo = createListingRepo();
  const listings = await listingRepo.listManagerListings(session.organizationId);
  const item = (listings as ManagerListingView[]).find((entry) => entry.unit.id === unitId);

  if (!item) {
    notFound();
  }

  return (
    <ListingEditorForm
      organizationId={session.organizationId}
      currentScopeLabel="Portefeuille unifié"
      item={item}
    />
  );
}