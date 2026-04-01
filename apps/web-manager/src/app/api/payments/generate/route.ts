import { generateRentCharges } from "../../../../api";
import { extractAuthSessionFromCookies } from "../../../../auth/session-adapter";
import { createPaymentRepo, createTeamFunctionsRepo, jsonResponse, parseJsonBody } from "../../shared";

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

  const result = await generateRentCharges(
    {
      body,
      session: await extractAuthSessionFromCookies()
    },
    { repository: createPaymentRepo(), teamFunctionsRepository: createTeamFunctionsRepo() }
  );

  return jsonResponse(result.status, result.body);
}
