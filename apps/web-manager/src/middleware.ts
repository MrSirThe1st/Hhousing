import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

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

  const { pathname } = request.nextUrl;

  // Helper: fetch memberships for user via Supabase client (Edge-compatible)
  async function getMembershipCount(userId: string): Promise<number> {
    try {
      const { count } = await supabase
        .from   ('organization_memberships')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      return count ?? 0;
    } catch {
      return 0;
    }
  }

  async function getOwnerPortalAccessCount(userId: string): Promise<number> {
    try {
      const { count } = await supabase
        .from('owner_portal_accesses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'active');
      return count ?? 0;
    } catch {
      return 0;
    }
  }

  // Public pages
  if (pathname === "/login" || pathname === "/signup") {
    if (user !== null) {
      // Check memberships
      const count = await getMembershipCount(user.id);
      if (count === 0) {
        return NextResponse.redirect(new URL("/account-type", request.url));
      } else {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
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
      const ownerAccessCount = await getOwnerPortalAccessCount(user.id);
      if (ownerAccessCount > 0) {
        return NextResponse.redirect(new URL("/owner-portal/dashboard", request.url));
      }
    }
    return response;
  }

  // Owner portal dashboard: requires authenticated user with active owner access.
  if (pathname.startsWith("/owner-portal/dashboard")) {
    if (user === null) {
      return NextResponse.redirect(new URL("/owner-portal/login", request.url));
    }

    const ownerAccessCount = await getOwnerPortalAccessCount(user.id);
    if (ownerAccessCount === 0) {
      return NextResponse.redirect(new URL("/owner-portal/login", request.url));
    }

    return response;
  }

  return response;
}

export const config = {
  matcher: ["/", "/marketplace", "/login", "/signup", "/account-type", "/onboarding", "/dashboard/:path*", "/owner-portal/:path*"]
};
