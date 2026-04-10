import { inviteOwner } from "../../../../../api";
import { extractAuthSessionFromCookies } from "../../../../../auth/session-adapter";
import { createOwnerInvitationEmailSenderFromEnv } from "../../../../../lib/email/resend";
import {
  createId,
  createRepositoryFromEnv,
  jsonResponse,
  parseJsonBody
} from "../../../shared";
import { createOwnerPortalAccessRepositoryFromEnv } from "@hhousing/data-access";

export async function POST(
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

  const { id } = await params;
  const propertyRepositoryResult = createRepositoryFromEnv();
  if (!propertyRepositoryResult.success) {
    return jsonResponse(500, propertyRepositoryResult);
  }

  const result = await inviteOwner(
    {
      ownerId: id,
      body,
      session: await extractAuthSessionFromCookies()
    },
    {
      repository: createOwnerPortalAccessRepositoryFromEnv(process.env),
      propertyRepository: propertyRepositoryResult.data,
      createId: () => createId("owi"),
      inviteLinkBaseUrl:
        process.env.OWNER_PORTAL_INVITE_URL_BASE?.trim() ||
        "http://localhost:3001/owner-invite",
      sendInvitationEmail: createOwnerInvitationEmailSenderFromEnv()
    }
  );

  return jsonResponse(result.status, result.body);
}
