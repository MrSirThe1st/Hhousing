"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../lib/supabase/browser";

export default function SignOutButton(): React.ReactElement {
  const router = useRouter();

  async function handleSignOut(): Promise<void> {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => {
        void handleSignOut();
      }}
      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:border-[#0063fe] hover:text-[#0063fe]"
    >
      Se déconnecter
    </button>
  );
}
