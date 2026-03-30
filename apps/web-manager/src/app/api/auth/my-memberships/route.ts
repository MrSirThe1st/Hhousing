import { extractAuthSessionFromRequest } from "../../../../auth/session-adapter";
import { createAuthRepositoryFromEnv } from "@hhousing/data-access";

export async function GET(request: Request): Promise<Response> {
  const session = await extractAuthSessionFromRequest(request);
  if (!session) {
    return new Response(JSON.stringify({ memberships: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
  const authRepo = createAuthRepositoryFromEnv(process.env);
  const memberships = await authRepo.listMembershipsByUserId(session.userId);
  return new Response(JSON.stringify({ memberships }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}