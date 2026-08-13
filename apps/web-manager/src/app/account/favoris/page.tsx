import Link from "next/link";
import { createMarketplaceRepo } from "../../api/shared";
import { createSupabaseServerClient } from "../../../lib/supabase/server";
import PublicListingCard from "../../../components/public-listing-card";

export default async function AccountFavoritesPage(): Promise<React.ReactElement> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return <p className="text-sm text-slate-600">Connectez-vous pour voir vos favoris.</p>;
  }

  const items = await createMarketplaceRepo().listSavedListings(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-slate-900">Mes favoris</h2>
        <p className="mt-1 text-sm text-slate-600">
          {items.length} logement{items.length > 1 ? "s" : ""}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
          <p className="text-sm font-semibold text-slate-800">Aucun favori pour le moment</p>
          <p className="mt-1 text-sm text-slate-500">Enregistrez des logements depuis le catalogue.</p>
          <Link href="/marketplace" className="mt-4 inline-flex text-sm font-bold text-[#0063FE]">
            Voir le catalogue →
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) =>
            item.listing && item.available ? (
              <PublicListingCard key={item.saved.id} item={item.listing} compact showShareActions={false} />
            ) : (
              <article
                key={item.saved.id}
                className="rounded-2xl border border-slate-200 bg-slate-100 p-5 opacity-80"
              >
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Plus disponible</p>
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  Ce logement n&apos;est plus publié ou n&apos;est plus vacant.
                </p>
                <p className="mt-1 text-xs text-slate-500">Annonce : {item.saved.listingId}</p>
              </article>
            )
          )}
        </div>
      )}
    </div>
  );
}
