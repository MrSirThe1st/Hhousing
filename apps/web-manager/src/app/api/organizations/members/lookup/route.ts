import { lookupUserByEmail } from "../../../../../api/organizations/team-members";
import { extractAuthSessionFromCookies } from "../../../../../auth/session-adapter";
import { jsonResponse, parseJsonBody } from "../../../shared";


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
      error: "Missing Supabase Admin credentials"
    });
  }

  const result = await lookupUserByEmail(
    {
      body,
      session: await extractAuthSessionFromCookies()
    },
    {
      supabaseAdminUrl,
      supabaseServiceRoleKey
    }
  );

  return jsonResponse(result.status, result.body);
}
