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

export async function POST(request: Request): Promise<Response> {
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

  try {
    const authRepo = createAuthRepositoryFromEnv(process.env);

    const result = await authRepo.createOperatorAccount({
      organizationId: randomUUID(),
      organizationName: parsed.data.organizationName,
      platformExperience: parsed.data.platformExperience,
      membershipId: randomUUID(),
      userId,
      role: "property_manager",
      canOwnProperties: true
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
    if (error instanceof Error && error.message === "ORGANIZATION_ALREADY_EXISTS") {
      return new Response(
        JSON.stringify({
          success: false,
          code: "VALIDATION_ERROR",
          error: "Une organisation avec ce nom existe déjà."
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
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
