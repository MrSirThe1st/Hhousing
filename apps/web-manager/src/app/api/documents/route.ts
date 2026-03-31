import { createDocument, listDocuments } from "../../../api";
import { extractAuthSessionFromCookies } from "../../../auth/session-adapter";
import { createId, createDocumentRepo, jsonResponse, parseJsonBody } from "../shared";

export async function POST(request: Request): Promise<Response> {
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

  const result = await createDocument(
    {
      body,
      session: await extractAuthSessionFromCookies()
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

  const result = await listDocuments(
    {
      organizationId: searchParams.get("organizationId"),
      attachmentType: searchParams.get("attachmentType"),
      attachmentId: searchParams.get("attachmentId"),
      documentType: searchParams.get("documentType"),
      session: await extractAuthSessionFromCookies()
    },
    { repository: createDocumentRepo() }
  );

  return jsonResponse(result.status, result.body);
}
