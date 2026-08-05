import { acceptTeamMemberInvitation } from "../../../../../api";
import { extractAuthSessionFromCookies } from "../../../../../auth/session-adapter";
import {
  captureServerEvent,
  readPostHogDistinctId
} from "../../../../../lib/posthog-server";
import { createAuthRepo, createId, jsonResponse, parseJsonBody } from "../../../shared";

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

  const supabaseAdminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseAdminUrl || !supabaseServiceRoleKey) {
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Supabase admin configuration missing"
    });
  }

  const session = await extractAuthSessionFromCookies();
  const result = await acceptTeamMemberInvitation(
    {
      body,
      session
    },
    {
      repository: createAuthRepo(),
      createMembershipId: () => createId("mbr"),
      supabaseAdminUrl,
      supabaseServiceRoleKey
    }
  );

  if (result.body.success && session !== null) {
    await captureServerEvent({
      distinctId: readPostHogDistinctId(request, session.userId),
      event: "team_invitation_accepted",
      properties: {
        organization_id: "organizationId" in session ? session.organizationId : undefined,
        source: "api"
      }
    });
  }

  return jsonResponse(result.status, result.body);
}