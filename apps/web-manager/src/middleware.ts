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

  // Preserve public auth pages for anyone
  if (pathname === "/login" || pathname === "/signup") {
    // Authenticated users in login/signup → dashboard
    if (user !== null) {
      return NextResponse.redirect(new URL("/account-type", request.url));
    }
    return response;
  }

  // Root path → redirect based on auth state
  if (pathname === "/") {
    if (user === null) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    // Authenticated → account-type picker (let that page check memberships)
    return NextResponse.redirect(new URL("/account-type", request.url));
  }

  // Account-type picker - only for authenticated users
  if (pathname === "/account-type") {
    if (user === null) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
  }

  // Protected dashboard routes
  if (pathname.startsWith("/dashboard")) {
    if (user === null) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    // Authenticated users - let the server page validate membership
    return response;
  }

  return response;
}

export const config = {
  matcher: ["/", "/login", "/signup", "/account-type", "/dashboard/:path*"]
};
