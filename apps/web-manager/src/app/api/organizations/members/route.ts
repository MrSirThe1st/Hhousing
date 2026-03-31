import {
  invitePropertyManager,
  listOrganizationMembers
} from "../../../../api";
import { extractAuthSessionFromCookies } from "../../../../auth/session-adapter";
import { createAuthRepo, createTeamFunctionsRepo, createId, jsonResponse, parseJsonBody } from "../../shared";

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);

  const result = await listOrganizationMembers(
    {
      session: await extractAuthSessionFromCookies(),
      organizationId: searchParams.get("organizationId")
    },
    { repository: createAuthRepo() }
  );

  return jsonResponse(result.status, result.body);
}

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

  const result = await invitePropertyManager(
    {
      body,
      session: await extractAuthSessionFromCookies()
    },
    {
      repository: createAuthRepo(),
      teamFunctionsRepository: createTeamFunctionsRepo(),
      createId: () => createId("mbr")
    }
  );

  return jsonResponse(result.status, result.body);
}
