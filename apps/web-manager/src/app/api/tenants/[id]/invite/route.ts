import { createTenantInvitation } from "../../../../../api";
import { extractAuthSessionFromCookies } from "../../../../../auth/session-adapter";
import { createTenantInvitationNotificationDepsFromEnv } from "../../../../../lib/notifications/tenant-invitation-notifiers";
import {
  captureServerEvent,
  readPostHogDistinctId
} from "../../../../../lib/posthog-server";
import { createId, createRepositoryFromEnv, createTeamFunctionsRepo, createTenantLeaseRepo, jsonResponse } from "../../../shared";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const inviteLinkBaseUrl =
    process.env.MOBILE_TENANT_INVITE_URL_BASE?.trim()
    || `${(process.env.NEXT_PUBLIC_APP_URL ?? "https://www.harakaproperty.com").replace(/\/$/, "")}/invite`;
  const organizationRepositoryResult = createRepositoryFromEnv();
  const notificationDeps = createTenantInvitationNotificationDepsFromEnv();
  const session = await extractAuthSessionFromCookies();

  const result = await createTenantInvitation(
    {
      tenantId: id,
      session
    },
    {
      repository: createTenantLeaseRepo(),
      teamFunctionsRepository: createTeamFunctionsRepo(),
      organizationRepository: organizationRepositoryResult.success ? organizationRepositoryResult.data : undefined,
      createId: () => createId("tin"),
      inviteLinkBaseUrl,
      ...notificationDeps
    }
  );

  if (result.body.success && session !== null) {
    await captureServerEvent({
      distinctId: readPostHogDistinctId(request, session.userId),
      event: "tenant_invited",
      properties: {
        organization_id: "organizationId" in session ? session.organizationId : undefined,
        source: "api"
      }
    });
  }

  return jsonResponse(result.status, result.body);
}