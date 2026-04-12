import { createTenantInvitation } from "../../../../../api";
import { extractAuthSessionFromCookies } from "../../../../../auth/session-adapter";
import { createTenantInvitationEmailSenderFromEnv } from "../../../../../lib/email/resend";
import { createId, createRepositoryFromEnv, createTeamFunctionsRepo, createTenantLeaseRepo, jsonResponse } from "../../../shared";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const inviteLinkBaseUrl = process.env.MOBILE_TENANT_INVITE_URL_BASE?.trim() || "hhousing-tenant://accept-invite";
  const organizationRepositoryResult = createRepositoryFromEnv();

  const result = await createTenantInvitation(
    {
      tenantId: id,
      session: await extractAuthSessionFromCookies()
    },
    {
      repository: createTenantLeaseRepo(),
      teamFunctionsRepository: createTeamFunctionsRepo(),
      organizationRepository: organizationRepositoryResult.success ? organizationRepositoryResult.data : undefined,
      createId: () => createId("tin"),
      inviteLinkBaseUrl,
      sendInvitationEmail: createTenantInvitationEmailSenderFromEnv()
    }
  );

  return jsonResponse(result.status, result.body);
}