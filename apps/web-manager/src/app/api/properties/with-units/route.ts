import { listProperties } from "../../../../api";
import { extractAuthSessionFromCookies } from "../../../../auth/session-adapter";
import { isOperatorScope } from "../../../../lib/operator-context";
import { createRepositoryFromEnv, jsonResponse } from "../../shared";

export async function GET(request: Request): Promise<Response> {
  const repositoryResult = createRepositoryFromEnv();
  if (!repositoryResult.success) {
    return jsonResponse(500, repositoryResult);
  }

  const url = new URL(request.url);
  const organizationId = url.searchParams.get("organizationId")?.trim() ?? "";
  const managementContextRaw = url.searchParams.get("managementContext");
  if (!organizationId) {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: "organizationId query param is required"
    });
  }

  const result = await listProperties(
    {
      organizationId,
      session: await extractAuthSessionFromCookies(),
      filter: {
        managementContext: isOperatorScope(managementContextRaw) ? managementContextRaw : undefined
      }
    },
    {
      repository: repositoryResult.data
    }
  );

  return jsonResponse(result.status, result.body);
}
