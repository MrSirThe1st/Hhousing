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
  if (pathname === "/login" || pathname === "/signup") {
    if (user !== null) {
      const membershipExists = await hasMembership(user.id);
      if (membershipExists) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }

      const ownerAccessExists = await hasOwnerPortalAccess(user.id);
      if (ownerAccessExists) {
        return NextResponse.redirect(new URL("/owner-portal/dashboard", request.url));
      }

      return NextResponse.redirect(new URL("/account-type", request.url));
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
      const ownerAccessExists = await hasOwnerPortalAccess(user.id);
      if (ownerAccessExists) {
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

    const ownerAccessExists = await hasOwnerPortalAccess(user.id);
    if (!ownerAccessExists) {
      return NextResponse.redirect(new URL("/owner-portal/login", request.url));
    }

    return response;
  }

  return response;
}

export const config = {
  matcher: ["/", "/marketplace", "/login", "/signup", "/account-type", "/onboarding", "/dashboard/:path*", "/owner-portal/:path*"]
};
