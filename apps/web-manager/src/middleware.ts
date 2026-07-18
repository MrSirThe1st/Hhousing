
// DEBUG: Add logging for production routing issues
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { applyMobileCorsHeaders } from "./lib/mobile-cors";

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Mobile tenant API is called from Expo (native + web). Browsers need CORS.
  if (pathname.startsWith("/api/mobile")) {
    if (request.method === "OPTIONS") {
      const preflight = new NextResponse(null, { status: 204 });
      applyMobileCorsHeaders(preflight.headers, request);
      return preflight;
    }

    const response = NextResponse.next({ request });
    applyMobileCorsHeaders(response.headers, request);
    return response;
  }

  let response = NextResponse.next({ request });
  const debugLogs: string[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        }
      }
    }
  );

  const {
    data: { user }
  } = await supabase.auth.getUser();

  debugLogs.push(`[middleware] path=${pathname} user_id=${user?.id ?? "none"}`);

  // Fast existence checks avoid expensive exact-count scans on hot auth paths.
  async function hasMembership(userId: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from   ('organization_memberships')
        .select('id')
        .eq('user_id', userId)
        .limit(1);
      return (data?.length ?? 0) > 0;
    } catch {
      return false;
    }
  }

  async function hasOwnerPortalAccess(userId: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('owner_portal_accesses')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(1);
      return (data?.length ?? 0) > 0;
    } catch {
      return false;
    }
  }

  // Public pages
  if (pathname === "/login" || pathname === "/signup" || pathname === "/invite") {
    if (user !== null) {
      const membershipExists = await hasMembership(user.id);
      debugLogs.push(`[middleware] /login: membershipExists=${membershipExists}`);
      if (membershipExists) {
        debugLogs.push(`[middleware] /login: redirecting to /dashboard`);
        logDebug(debugLogs);
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }

      const ownerAccessExists = await hasOwnerPortalAccess(user.id);
      debugLogs.push(`[middleware] /login: ownerAccessExists=${ownerAccessExists}`);
      if (ownerAccessExists) {
        debugLogs.push(`[middleware] /login: redirecting to /owner-portal/dashboard`);
        logDebug(debugLogs);
        return NextResponse.redirect(new URL("/owner-portal/dashboard", request.url));
      }

      debugLogs.push(`[middleware] /login: redirecting to /account-type`);
      logDebug(debugLogs);
      return NextResponse.redirect(new URL("/account-type", request.url));
    }
    debugLogs.push(`[middleware] /login: unauthenticated, showing login form`);
    logDebug(debugLogs);
    return response;
  }

  // Root path stays public so the marketplace landing page is the first page visitors see.
  if (pathname === "/" || pathname === "/marketplace") {
    return response;
  }

  // Onboarding/account-type: only for authenticated users
  if (pathname === "/account-type" || pathname === "/onboarding") {
    if (user === null) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
  }

  // Dashboard: only for authenticated users
  if (pathname.startsWith("/dashboard")) {
    if (user === null) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
  }

  // Owner invite stays public for token handling; owner login redirects only if user has active owner access.
  if (pathname === "/owner-portal/invite") {
    return response;
  }

  if (pathname === "/owner-portal/login") {
    if (user !== null) {
      const ownerAccessExists = await hasOwnerPortalAccess(user.id);
      debugLogs.push(`[middleware] /owner-portal/login: ownerAccessExists=${ownerAccessExists}`);
      if (ownerAccessExists) {
        debugLogs.push(`[middleware] /owner-portal/login: redirecting to /owner-portal/dashboard`);
        logDebug(debugLogs);
        return NextResponse.redirect(new URL("/owner-portal/dashboard", request.url));
      }
    }
    debugLogs.push(`[middleware] /owner-portal/login: unauthenticated or no access, showing login form`);
    logDebug(debugLogs);
    return response;
  }

  // Owner portal dashboard: requires authenticated user with active owner access.
  if (pathname.startsWith("/owner-portal/dashboard")) {
    if (user === null) {
      return NextResponse.redirect(new URL("/owner-portal/login", request.url));
    }

    const ownerAccessExists = await hasOwnerPortalAccess(user.id);
    if (!ownerAccessExists) {
      return NextResponse.redirect(new URL("/owner-portal/login", request.url));
    }

    return response;
  }

  return response;
}

// Utility: log debug info to server console (only in production)
function logDebug(logs: string[]): void {
  if (process.env.NODE_ENV === "production") {
    // eslint-disable-next-line no-console
    console.log(logs.join(" | "));
  }
}

export const config = {
  matcher: [
    "/",
    "/marketplace",
    "/login",
    "/signup",
    "/account-type",
    "/onboarding",
    "/dashboard/:path*",
    "/owner-portal/:path*",
    "/api/mobile/:path*"
  ]
};
