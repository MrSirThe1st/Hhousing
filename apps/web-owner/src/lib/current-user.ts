import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export interface CurrentAuthenticatedUser {
  id: string;
  email: string | null;
}

export async function getCurrentAuthenticatedUser(): Promise<CurrentAuthenticatedUser | null> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // no-op in route handlers
        }
      }
    }
  );

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user === null) {
    return null;
  }

  return {
    id: user.id,
    email: user.email ?? null
  };
}