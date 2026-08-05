import { createProperty } from "../../../api";
import { extractAuthSessionFromCookies } from "../../../auth/session-adapter";
import {
  captureServerEvent,
  captureServerException,
  readPostHogDistinctId
} from "../../../lib/posthog-server";
import { createId, createRepositoryFromEnv, createTeamFunctionsRepo, jsonResponse, parseJsonBody } from "../shared";

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

  const session = await extractAuthSessionFromCookies();

  try {
    const result = await createProperty(
      {
        body,
        session
      },
      {
        repository: repositoryResult.data,
        teamFunctionsRepository: createTeamFunctionsRepo(),
        createId
      }
    );

    if (result.body.success && session !== null) {
      await captureServerEvent({
        distinctId: readPostHogDistinctId(request, session.userId),
        event: "property_created",
        properties: {
          organization_id: session.organizationId,
          source: "api"
        }
      });
    }

    return jsonResponse(result.status, result.body);
  } catch (error) {
    if (session !== null) {
      await captureServerException(error, readPostHogDistinctId(request, session.userId));
    }
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Unexpected server error while creating property"
    });
  }
}
