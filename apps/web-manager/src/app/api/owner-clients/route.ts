import { createOwner, listOwners } from "../../../api";
import { extractAuthSessionFromCookies } from "../../../auth/session-adapter";
import { rejectIfIndividualExperience } from "../../../lib/entreprise-experience-guard";
import { createId, createRepositoryFromEnv, jsonResponse, parseJsonBody } from "../shared";

export async function POST(request: Request): Promise<Response> {
  const session = await extractAuthSessionFromCookies();
  const experienceDenied = await rejectIfIndividualExperience(session);
  if (experienceDenied !== null) {
    return experienceDenied;
  }

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

  const result = await createOwner(
    {
      body,
      session
    },
    {
      repository: repositoryResult.data,
      createId: () => createId("own")
    }
  );

  return jsonResponse(result.status, result.body);
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const repositoryResult = createRepositoryFromEnv();
  if (!repositoryResult.success) {
    return jsonResponse(500, repositoryResult);
  }

  const result = await listOwners(
    {
      organizationId: searchParams.get("organizationId"),
      session: await extractAuthSessionFromCookies()
    },
    {
      repository: repositoryResult.data
    }
  );

  return jsonResponse(result.status, result.body);
}