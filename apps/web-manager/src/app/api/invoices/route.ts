import { listInvoices } from "../../../api";
import { extractAuthSessionFromCookies } from "../../../auth/session-adapter";
import { createInvoiceRepo, createTeamFunctionsRepo, jsonResponse } from "../shared";

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const session = await extractAuthSessionFromCookies();

  const result = await listInvoices(
    {
      organizationId: searchParams.get("organizationId"),
      leaseId: searchParams.get("leaseId"),
      status: searchParams.get("status"),
      emailStatus: searchParams.get("emailStatus"),
      year: searchParams.get("year"),
      session
    },
    {
      repository: createInvoiceRepo(),
      teamFunctionsRepository: createTeamFunctionsRepo()
    }
  );

  return jsonResponse(result.status, result.body);
}
