import { updateOwner } from "../../../../api";
import { extractAuthSessionFromCookies } from "../../../../auth/session-adapter";
import { createRepositoryFromEnv, jsonResponse, parseJsonBody } from "../../shared";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
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

  const repositoryResult = createRepositoryFromEnv();
  if (!repositoryResult.success) {
    return jsonResponse(500, repositoryResult);
  }

  const { id } = await params;

  const result = await updateOwner(
    {
      ownerId: id,
      body,
      session: await extractAuthSessionFromCookies()
    },
    {
      repository: repositoryResult.data
    }
  );

  return jsonResponse(result.status, result.body);
}
