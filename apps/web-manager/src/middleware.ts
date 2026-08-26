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
        .from("organization_memberships")
        .select("id")
        .eq("user_id", userId)
        .limit(1);
      return (data?.length ?? 0) > 0;
    } catch {
      return false;
    }
  }

  async function hasOwnerPortalAccess(userId: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from("owner_portal_accesses")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "active")
        .limit(1);
      return (data?.length ?? 0) > 0;
    } catch {
      return false;
    }
  }

  async function hasPlatformAdmin(userId: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", userId)
        .eq("status", "active")
        .limit(1);
      return (data?.length ?? 0) > 0;
    } catch {
      return false;
    }
  }

  // Public pages
  if (pathname === "/login" || pathname === "/signup" || pathname === "/invite") {
    if (user !== null) {
      const platformAdminExists = await hasPlatformAdmin(user.id);
      debugLogs.push(`[middleware] /login: platformAdminExists=${platformAdminExists}`);
      if (platformAdminExists) {
        debugLogs.push(`[middleware] /login: redirecting to /admin`);
        logDebug(debugLogs);
        return NextResponse.redirect(new URL("/admin", request.url));
      }

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

  // Marketplace seeker account area is paused: send users to login/dashboard flows instead.
  if (pathname === "/account" || pathname.startsWith("/account/")) {
    if (user === null) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (await hasPlatformAdmin(user.id)) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    if (await hasMembership(user.id)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/account-type", request.url));
  }

  // Onboarding/account-type: only for authenticated users; platform admins skip to /admin
  if (pathname === "/account-type" || pathname === "/onboarding") {
    if (user === null) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (await hasPlatformAdmin(user.id)) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return response;
  }

  // Platform admin console
  if (pathname.startsWith("/admin")) {
    if (user === null) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (!(await hasPlatformAdmin(user.id))) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return response;
  }

  // Dashboard: operators only (platform admins go to /admin)
  if (pathname.startsWith("/dashboard")) {
    if (user === null) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (await hasPlatformAdmin(user.id)) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return response;
  }

  // Owner invite stays public for token handling.
  if (pathname === "/owner-portal/invite") {
    return response;
  }

  // Legacy owner login URL — always use the shared /login.
  if (pathname === "/owner-portal/login") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Owner portal dashboard: requires authenticated user with active owner access.
  if (pathname.startsWith("/owner-portal/dashboard")) {
    if (user === null) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (await hasPlatformAdmin(user.id)) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    const ownerAccessExists = await hasOwnerPortalAccess(user.id);
    if (!ownerAccessExists) {
      return NextResponse.redirect(new URL("/account-type", request.url));
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
    "/account",
    "/account/:path*",
    "/onboarding",
    "/dashboard/:path*",
    "/admin",
    "/admin/:path*",
    "/owner-portal/:path*",
    "/api/mobile/:path*"
  ]
};
