import { redirect } from "next/navigation";
import type { ListingApplicationView, ManagerListingView } from "@hhousing/api-contracts";
import ListingManagementPanel from "../../../components/listing-management-panel";
import { createListingRepo } from "../../api/shared";
import { getOperatorScopeLabel, getServerOperatorContext } from "../../../lib/operator-context";
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
  const operatorContext = await getServerOperatorContext(session);
  const listingRepo = createListingRepo();

  const [listings, applications] = await Promise.all([
    listingRepo.listManagerListings(session.organizationId, operatorContext.currentScope),
    listingRepo.listApplications(session.organizationId, operatorContext.currentScope)
  ]);

  return (
    <ListingManagementPanel
      organizationId={session.organizationId}
      currentScopeLabel={getOperatorScopeLabel(operatorContext.currentScope)}
      activeTab={activeTab}
      listings={listings as ManagerListingView[]}
      applications={applications as ListingApplicationView[]}
    />
  );
}