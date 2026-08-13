import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../lib/supabase/server";
import { createMarketplaceRepo } from "../api/shared";
import PublicSiteFooter from "../../components/public-site-footer";
import PublicSiteNavbar from "../../components/public-site-navbar";

const NAV = [
  { href: "/account", label: "Aperçu" },
  { href: "/account/favoris", label: "Mes favoris" },
  { href: "/account/candidatures", label: "Mes candidatures" },
  { href: "/account/demandes", label: "Mes demandes" },
  { href: "/account/profil", label: "Mon profil" }
] as const;

export default async function AccountLayout({
  children
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const repo = createMarketplaceRepo();
  await repo.upsertProfile({
    userId: user.id,
    email: user.email ?? null,
    fullName:
      typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null
  });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <PublicSiteNavbar />
      <div className="mx-auto max-w-6xl px-6 py-10 lg:px-10">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Catalogue</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Mon compte</h1>
        </div>

        <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
          <nav className="flex flex-row gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#0063FE] hover:text-[#0063FE]"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/marketplace"
              className="whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:text-[#0063FE]"
            >
              ← Retour au catalogue
            </Link>
          </nav>
          <div>{children}</div>
        </div>
      </div>
      <PublicSiteFooter />
    </main>
  );
}
