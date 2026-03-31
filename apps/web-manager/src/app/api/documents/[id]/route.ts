import { deleteDocument } from "../../../../api";
import { extractAuthSessionFromCookies } from "../../../../auth/session-adapter";
import { createDocumentRepo, jsonResponse } from "../../shared";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const params = await context.params;

  const result = await deleteDocument(
    {
      documentId: params.id,
      session: await extractAuthSessionFromCookies()
    },
    { repository: createDocumentRepo() }
  );

  return jsonResponse(result.status, result.body);
}
