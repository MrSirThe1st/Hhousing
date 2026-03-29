import type { ApiResult } from "@hhousing/api-contracts";
import { parseCreateOperatorAccountInput } from "@hhousing/api-contracts";
import { createAuthRepositoryFromEnv } from "@hhousing/data-access";
import { extractAuthSessionFromRequest } from "../../../auth/session-adapter";
import { mapErrorCodeToHttpStatus } from "../../shared";
import { randomUUID } from "crypto";

function accountTypeToRoleAndCapabilities(accountType: string): { role: "landlord" | "property_manager"; canOwnProperties: boolean } {
  if (accountType === "self_managed_owner") {
    return { role: "landlord", canOwnProperties: true };
  }
  if (accountType === "manager_for_others") {
    return { role: "property_manager", canOwnProperties: false };
  }
  if (accountType === "mixed_operator") {
    return { role: "property_manager", canOwnProperties: true };
  }
  return { role: "property_manager", canOwnProperties: false };
}

export async function POST(request: Request): Promise<Response> {
  // Verify user is authenticated
  const session = await extractAuthSessionFromRequest(request);
  if (session === null) {
    return new Response(
      JSON.stringify({
        success: false,
        code: "UNAUTHORIZED",
        error: "Authentication required"
      }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Parse input
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        success: false,
        code: "VALIDATION_ERROR",
        error: "Invalid JSON"
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const parsed = parseCreateOperatorAccountInput(input);
  if (!parsed.success) {
    return new Response(
      JSON.stringify(parsed),
      { status: mapErrorCodeToHttpStatus(parsed.code), headers: { "Content-Type": "application/json" } }
    );
  }

  // Tenants shouldn't create accounts in web-manager
  if (parsed.data.accountType === "tenant") {
    return new Response(
      JSON.stringify({
        success: false,
        code: "FORBIDDEN",
        error: "Tenants must use the mobile app"
      }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const authRepo = createAuthRepositoryFromEnv(process.env);
    const { role, canOwnProperties } = accountTypeToRoleAndCapabilities(parsed.data.accountType);

    const result = await authRepo.createOperatorAccount({
      organizationId: randomUUID(),
      organizationName: parsed.data.organizationName,
      membershipId: randomUUID(),
      userId: session.userId,
      role,
      canOwnProperties
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: result
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Failed to create operator account", error);
    return new Response(
      JSON.stringify({
        success: false,
        code: "INTERNAL_ERROR",
        error: "Failed to create account"
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
