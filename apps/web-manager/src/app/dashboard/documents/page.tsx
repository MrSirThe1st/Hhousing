import { redirect } from "next/navigation";
import type { Document } from "@hhousing/domain";
import { listDocuments } from "../../../api";
import { filterDocumentsByScope, getScopedPortfolioData } from "../../../lib/operator-scope-portfolio";
import { createDocumentRepo } from "../../api/shared";
import { getServerAuthSession } from "../../../lib/session";
import DocumentManagementPanel from "../../../components/document-management-panel";

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

  return (
    <DocumentManagementPanel
      organizationId={session.organizationId ?? ""}
      documents={documents}
    />
  );
}
