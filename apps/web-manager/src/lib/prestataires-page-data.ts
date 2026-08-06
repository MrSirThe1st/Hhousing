import { listPrestatairesCatalog } from "../api/prestataires/prestataires";
import { requireDashboardSectionAccess } from "../lib/dashboard-access";
import { getScopedPortfolioData } from "../lib/operator-scope-portfolio";
import { createServiceProviderRepo } from "../app/api/shared";
import type { PrestatairesAssignment, PrestatairesPropertyOption } from "../components/prestataires-shared";
import type { ServiceProviderCategory, ServiceProviderWithCategory } from "@hhousing/api-contracts";

export type PrestatairesPageData = {
  writable: boolean;
  categories: ServiceProviderCategory[];
  platformProviders: ServiceProviderWithCategory[];
  orgProviders: ServiceProviderWithCategory[];
  assignments: PrestatairesAssignment[];
  properties: PrestatairesPropertyOption[];
};

export async function loadPrestatairesPageData(): Promise<PrestatairesPageData> {
  const { session, access } = await requireDashboardSectionAccess("services");

  const [catalogResult, scopedPortfolio] = await Promise.all([
    listPrestatairesCatalog(session, { repository: createServiceProviderRepo() }),
    getScopedPortfolioData(session)
  ]);

  const catalog = catalogResult.body.success
    ? catalogResult.body.data
    : {
        categories: [],
        platformProviders: [],
        orgProviders: [],
        assignments: []
      };

  const assignments = catalog.assignments.filter((item) =>
    scopedPortfolio.propertyIds.has(item.propertyId)
  );

  const properties = scopedPortfolio.properties.map((item) => ({
    id: item.property.id,
    name: item.property.name
  }));

  return {
    writable: access.servicesWritable,
    categories: catalog.categories,
    platformProviders: catalog.platformProviders,
    orgProviders: catalog.orgProviders,
    assignments,
    properties
  };
}
