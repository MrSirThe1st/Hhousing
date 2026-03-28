import { createUnit } from "../../../api";
import { extractAuthSessionFromRequest } from "../../../auth/session-adapter";
import { createId, createRepositoryFromEnv, jsonResponse, parseJsonBody } from "../shared";

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

  const repositoryResult = createRepositoryFromEnv();
  if (!repositoryResult.success) {
    return jsonResponse(500, repositoryResult);
  }

  const result = await createUnit(
    {
      body,
      session: await extractAuthSessionFromRequest(request)
    },
    {
      repository: repositoryResult.data,
      createId: () => createId("unt")
    }
  );

  return jsonResponse(result.status, result.body);
}
