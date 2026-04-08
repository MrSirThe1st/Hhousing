import { redirect } from "next/navigation";
import type { LeaseWithTenantView, PropertyWithUnitsView } from "@hhousing/api-contracts";
import type { Document, Tenant } from "@hhousing/domain";
import { listDocuments, listTenants } from "../../../api";
import { filterDocumentsByScope, filterTenantsByScope, getScopedPortfolioData } from "../../../lib/operator-scope-portfolio";
import { createDocumentRepo, createTenantLeaseRepo } from "../../api/shared";
import { getServerAuthSession } from "../../../lib/session";
import DocumentsWorkspacePanel from "../../../components/documents-workspace-panel";

export default async function DocumentsPage(): Promise<React.ReactElement> {
  const session = await getServerAuthSession();
  if (!session) redirect("/login");

  const documentRepo = createDocumentRepo();

  const documentsResult = await listDocuments(
    {
      session,
      organizationId: session.organizationId ?? "",
      attachmentType: null,
      attachmentId: null,
      documentType: null
    },
    { repository: documentRepo }
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
      repository: createTenantLeaseRepo()
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

  return (
    <DocumentsWorkspacePanel
      organizationId={session.organizationId ?? ""}
      documents={documents}
      properties={properties}
      leases={leases}
      tenants={tenants}
    />
  );
}
