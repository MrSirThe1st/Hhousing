import { redirect } from "next/navigation";
import type { ListingApplicationView, ManagerListingView } from "@hhousing/api-contracts";
import ListingManagementPanel from "../../../components/listing-management-panel";
import { createListingRepo } from "../../api/shared";
import { getServerAuthSession } from "../../../lib/session";

type ListingsPageProps = {
  searchParams?: Promise<{ tab?: string }>;
};

type ListingsWorkspaceTab = "listings" | "applications" | "screening";

function getActiveTab(value: string | undefined): ListingsWorkspaceTab {
  if (value === "applications" || value === "screening") {
    return value;
  }

  return "listings";
}

export default async function ListingsPage({ searchParams }: ListingsPageProps): Promise<React.ReactElement> {
  const session = await getServerAuthSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const activeTab = getActiveTab(params?.tab);
  const listingRepo = createListingRepo();

  const [listings, applications] = await Promise.all([
    listingRepo.listManagerListings(session.organizationId),
    listingRepo.listApplications(session.organizationId)
  ]);

  return (
    <ListingManagementPanel
      organizationId={session.organizationId}
      currentScopeLabel="Portefeuille unifié"
      activeTab={activeTab}
      listings={listings as ManagerListingView[]}
      applications={applications as ListingApplicationView[]}
    />
  );
}