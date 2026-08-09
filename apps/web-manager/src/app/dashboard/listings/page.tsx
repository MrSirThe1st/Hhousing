import type { ListingApplicationView, ManagerListingView } from "@hhousing/api-contracts";
import ListingManagementPanel from "../../../components/listing-management-panel";
import DashboardPageLoadError from "../../../components/dashboard-page-load-error";
import { createListingRepo } from "../../api/shared";
import { requireDashboardSectionAccess } from "../../../lib/dashboard-access";

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
  const { session } = await requireDashboardSectionAccess("operations");

  const params = await searchParams;
  const activeTab = getActiveTab(params?.tab);
  const listingRepo = createListingRepo();
  const needsApplications = activeTab === "applications" || activeTab === "screening";

  let listings: ManagerListingView[] = [];
  let applications: ListingApplicationView[] = [];
  let loadError: string | null = null;

  try {
    if (needsApplications) {
      const [listingRows, applicationRows] = await Promise.all([
        listingRepo.listManagerListings(session.organizationId),
        listingRepo.listApplications(session.organizationId)
      ]);
      listings = listingRows as ManagerListingView[];
      applications = applicationRows as ListingApplicationView[];
    } else {
      listings = (await listingRepo.listManagerListings(session.organizationId)) as ManagerListingView[];
    }
  } catch (error) {
    console.error("Failed to load listings workspace", error);
    loadError = "Impossible de charger les annonces pour le moment. Réessayez dans un instant.";
  }

  return (
    <div id="listings-container">
      {loadError ? <DashboardPageLoadError message={loadError} /> : null}
      <ListingManagementPanel
        organizationId={session.organizationId}
        currentScopeLabel="Tous mes biens"
        activeTab={activeTab}
        listings={listings}
        applications={applications}
      />
    </div>
  );
}
