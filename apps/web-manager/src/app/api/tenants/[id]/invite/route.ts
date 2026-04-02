import { createTenantInvitation } from "../../../../../api";
import { extractAuthSessionFromCookies } from "../../../../../auth/session-adapter";
import { createId, createTenantLeaseRepo, jsonResponse } from "../../../shared";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;

  const result = await createTenantInvitation(
    {
      tenantId: id,
      session: await extractAuthSessionFromCookies()
    },
    {
      repository: createTenantLeaseRepo(),
      createId: () => createId("tin"),
      inviteLinkBaseUrl: process.env.MOBILE_TENANT_INVITE_URL_BASE ?? "hhousing-tenant://accept-invite"
    }
  );

  return jsonResponse(result.status, result.body);
}