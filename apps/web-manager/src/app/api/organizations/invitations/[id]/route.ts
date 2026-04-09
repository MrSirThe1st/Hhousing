import {
  resendTeamMemberInvitation,
  revokeTeamMemberInvitation
} from "../../../../../api";
import { extractAuthSessionFromCookies } from "../../../../../auth/session-adapter";
import {
  createAuthRepo,
  createTeamFunctionsRepo,
  createId,
  jsonResponse
} from "../../../shared";
import { createTeamMemberInvitationEmailSenderFromEnv } from "../../../../../lib/email/resend";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;

  const result = await resendTeamMemberInvitation(
    {
      invitationId: id,
      session: await extractAuthSessionFromCookies()
    },
    {
      repository: createAuthRepo(),
      teamFunctionsRepository: createTeamFunctionsRepo(),
      createId: () => createId("tmi"),
      inviteLinkBaseUrl:
        process.env.TEAM_MEMBER_INVITE_URL_BASE?.trim() ||
        "http://localhost:3000/team-invite",
      sendInvitationEmail: createTeamMemberInvitationEmailSenderFromEnv()
    }
  );

  return jsonResponse(result.status, result.body);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;

  const result = await revokeTeamMemberInvitation(
    {
      invitationId: id,
      session: await extractAuthSessionFromCookies()
    },
    {
      repository: createAuthRepo(),
      teamFunctionsRepository: createTeamFunctionsRepo()
    }
  );

  return jsonResponse(result.status, result.body);
}