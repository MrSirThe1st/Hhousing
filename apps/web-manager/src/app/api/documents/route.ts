import { createDocument, listDocuments } from "../../../api";
import { extractAuthSessionFromCookies } from "../../../auth/session-adapter";
import {
  filterDocumentsByScope,
  getScopedPortfolioData,
  isDocumentAttachmentInScope
} from "../../../lib/operator-scope-portfolio";
import { createId, createDocumentRepo, jsonResponse, parseJsonBody } from "../shared";

export async function POST(request: Request): Promise<Response> {
  const session = await extractAuthSessionFromCookies();

  let body: unknown;
  try {
    body = await parseJsonBody(request);
  } catch {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: "Body must be valid JSON"
    });
  }

  if (session !== null && typeof body === "object" && body !== null) {
    const payload = body as Record<string, unknown>;
    const attachmentType = payload.attachmentType;
    const attachmentId = typeof payload.attachmentId === "string" ? payload.attachmentId : null;

    if (
      attachmentId !== null &&
      (attachmentType === "property" || attachmentType === "unit" || attachmentType === "tenant" || attachmentType === "lease")
    ) {
      const scopedPortfolio = await getScopedPortfolioData(session);
      if (!isDocumentAttachmentInScope(attachmentType, attachmentId, scopedPortfolio)) {
        return jsonResponse(404, {
          success: false,
          code: "NOT_FOUND",
          error: "Attachment not found"
        });
      }
    }
  }

  const result = await createDocument(
    {
      body,
      session
    },
    {
      repository: createDocumentRepo(),
      createId: () => createId("doc")
    }
  );

  return jsonResponse(result.status, result.body);
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const session = await extractAuthSessionFromCookies();

  const result = await listDocuments(
    {
      organizationId: searchParams.get("organizationId"),
      attachmentType: searchParams.get("attachmentType"),
      attachmentId: searchParams.get("attachmentId"),
      documentType: searchParams.get("documentType"),
      session
    },
    { repository: createDocumentRepo() }
  );

  if (result.body.success && session !== null) {
    const scopedPortfolio = await getScopedPortfolioData(session);
    return jsonResponse(result.status, {
      success: true,
      data: {
        documents: filterDocumentsByScope(result.body.data.documents, scopedPortfolio)
      }
    });
  }

  return jsonResponse(result.status, result.body);
}
