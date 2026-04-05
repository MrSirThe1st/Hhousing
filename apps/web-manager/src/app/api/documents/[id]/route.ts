import { deleteDocument } from "../../../../api";
import { extractAuthSessionFromCookies } from "../../../../auth/session-adapter";
import { getScopedPortfolioData, isDocumentAttachmentInScope } from "../../../../lib/operator-scope-portfolio";
import { createDocumentRepo, jsonResponse } from "../../shared";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const params = await context.params;
  const session = await extractAuthSessionFromCookies();
  const repository = createDocumentRepo();

  if (session !== null) {
    const document = await repository.getDocumentById(params.id, session.organizationId);
    if (!document) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Document not found"
      });
    }

    const scopedPortfolio = await getScopedPortfolioData(session);
    if (!isDocumentAttachmentInScope(document.attachmentType, document.attachmentId, scopedPortfolio)) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Document not found"
      });
    }
  }

  const result = await deleteDocument(
    {
      documentId: params.id,
      session
    },
    { repository }
  );

  return jsonResponse(result.status, result.body);
}
