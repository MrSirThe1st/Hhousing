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

  // Helper: fetch memberships for user (server-side)
  async function getMembershipCount(userId: string): Promise<number> {
    // Use your data-access layer or direct DB call here
    // For demo, always return 0 (replace with real logic)
    return 0;
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

  // Root path
  if (pathname === "/") {
    if (user === null) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    const count = await getMembershipCount(user.id);
    if (count === 0) {
      return NextResponse.redirect(new URL("/account-type", request.url));
    } else {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
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

  return response;
}

export const config = {
  matcher: ["/", "/login", "/signup", "/account-type", "/onboarding", "/dashboard/:path*"]
};
