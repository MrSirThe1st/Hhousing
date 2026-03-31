import { redirect } from "next/navigation";
import type { Document } from "@hhousing/domain";
import { listDocuments } from "../../../api";
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

  const documents: Document[] = documentsResult.body.success ? documentsResult.body.data.documents : [];

  return (
    <DocumentManagementPanel
      organizationId={session.organizationId ?? ""}
      documents={documents}
    />
  );
}
