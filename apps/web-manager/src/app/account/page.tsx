import Link from "next/link";
import { createMarketplaceRepo } from "../api/shared";
import { createSupabaseServerClient } from "../../lib/supabase/server";

export default async function AccountHomePage(): Promise<React.ReactElement> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const repo = createMarketplaceRepo();
  const [favorites, applications, requests] = user
    ? await Promise.all([
        repo.listSavedListings(user.id),
        repo.listApplicationsForUser(user.id),
        repo.listViewingRequestsForUser(user.id)
      ])
    : [[], [], []];

  const cards = [
    {
      href: "/account/favoris",
      title: "Mes favoris",
      count: favorites.length,
      description: "Logements enregistrés"
    },
    {
      href: "/account/candidatures",
      title: "Mes candidatures",
      count: applications.length,
      description: "Demandes de location"
    },
    {
      href: "/account/demandes",
      title: "Mes demandes",
      count: requests.length,
      description: "Demandes de visite"
    }
  ] as const;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Bienvenue</h2>
        <p className="mt-2 text-sm text-slate-600">
          Gérez vos favoris, candidatures et préférences pour le catalogue Haraka.
        </p>
        <Link
          href="/marketplace"
          className="mt-4 inline-flex rounded-xl bg-[#0063FE] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0052d4]"
        >
          Parcourir le catalogue
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#0063FE]"
          >
            <p className="text-2xl font-black text-slate-900">{card.count}</p>
            <p className="mt-1 text-sm font-bold text-slate-800">{card.title}</p>
            <p className="mt-1 text-xs text-slate-500">{card.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
