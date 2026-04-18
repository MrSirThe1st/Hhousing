import { redirect } from "next/navigation";
import type { LeaseWithTenantView, PropertyWithUnitsView } from "@hhousing/api-contracts";
import type { Document, Organization, Tenant } from "@hhousing/domain";
import { listDocuments, listTenants } from "../../../api";
import { filterDocumentsByScope, filterTenantsByScope, getScopedPortfolioData } from "../../../lib/operator-scope-portfolio";
import { createDocumentRepo, createRepositoryFromEnv, createTeamFunctionsRepo, createTenantLeaseRepo } from "../../api/shared";
import ReadOnlyBanner from "../../../components/read-only-banner";
import { requireDashboardSectionAccess } from "../../../lib/dashboard-access";
import DocumentsWorkspacePanel from "../../../components/documents-workspace-panel";

export default async function DocumentsPage(): Promise<React.ReactElement> {
  const { session, access } = await requireDashboardSectionAccess("services");

  const documentRepo = createDocumentRepo();

  const documentsResult = await listDocuments(
    {
      session,
      organizationId: session.organizationId ?? "",
      attachmentType: null,
      attachmentId: null,
      documentType: null
    },
    {
      repository: documentRepo,
      teamFunctionsRepository: createTeamFunctionsRepo()
    }
  );

  const scopedPortfolio = await getScopedPortfolioData(session);

  const documents: Document[] = documentsResult.body.success
    ? filterDocumentsByScope(documentsResult.body.data.documents, scopedPortfolio)
    : [];

  const tenantsResult = await listTenants(
    {
      session,
      organizationId: session.organizationId ?? ""
    },
    {
      repository: createTenantLeaseRepo(),
      teamFunctionsRepository: createTeamFunctionsRepo()
    }
  );

  const tenants: Tenant[] = tenantsResult.body.success
    ? filterTenantsByScope(tenantsResult.body.data.tenants, scopedPortfolio)
    : [];

  const properties: PropertyWithUnitsView[] = scopedPortfolio.properties.map((item) => ({
    property: item.property,
    units: item.units
  }));

  const leases: LeaseWithTenantView[] = scopedPortfolio.leases;
  const repositoryResult = createRepositoryFromEnv();
  const organization: Organization | null = repositoryResult.success
    ? await repositoryResult.data.getOrganizationById(session.organizationId)
    : null;

  return (
    <>
      {!access.servicesWritable && <ReadOnlyBanner />}
      <DocumentsWorkspacePanel
        organizationId={session.organizationId ?? ""}
        organization={organization}
        documents={documents}
        properties={properties}
        leases={leases}
        tenants={tenants}
      />
    </>
  );
}
