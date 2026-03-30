import { createProperty } from "../../../api";
import { extractAuthSessionFromCookies } from "../../../auth/session-adapter";
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

  try {
    const result = await createProperty(
      {
        body,
        session: await extractAuthSessionFromCookies()
      },
      {
        repository: repositoryResult.data,
        createId: () => createId("prp")
      }
    );

    return jsonResponse(result.status, result.body);
  } catch {
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Unexpected server error while creating property"
    });
  }
}
