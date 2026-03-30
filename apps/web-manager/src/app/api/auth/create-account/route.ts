import { parseCreateOperatorAccountInput } from "@hhousing/api-contracts";
import { createAuthRepositoryFromEnv } from "@hhousing/data-access";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function mapErrorCodeToHttpStatus(code: string): number {
  if (code === "UNAUTHORIZED") {
    return 401;
  }

  if (code === "FORBIDDEN") {
    return 403;
  }

  if (code === "VALIDATION_ERROR") {
    return 400;
  }

  if (code === "NOT_FOUND") {
    return 404;
  }

  return 422;
}

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
  // Verify user is authenticated via cookies
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        }
      }
    }
  );

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user === null) {
    return new Response(
      JSON.stringify({
        success: false,
        code: "UNAUTHORIZED",
        error: "Authentication required"
      }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const userId = user.id;

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

  // Block tenant from creating operator accounts
  if (parsed.data.accountType === "tenant") {
    return new Response(
      JSON.stringify({
        success: false,
        code: "FORBIDDEN",
        error: "Tenant accounts cannot be created here. Use the mobile app or accept an invite."
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
      userId,
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
