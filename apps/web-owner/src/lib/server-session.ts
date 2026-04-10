import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createOwnerPortalAccessRepositoryFromEnv, type OwnerPortalAccessRecord } from "@hhousing/data-access";

export interface OwnerPortalSession {
  userId: string;
  accesses: OwnerPortalAccessRecord[];
}

export async function getOwnerPortalSession(): Promise<OwnerPortalSession | null> {
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
          // no-op in server components
        }
      }
    }
  );

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const repository = createOwnerPortalAccessRepositoryFromEnv(process.env);
  const accesses = await repository.listOwnerPortalAccessesByUserId(user.id);
  if (accesses.length === 0) {
    return null;
  }

  return {
    userId: user.id,
    accesses
  };
}
