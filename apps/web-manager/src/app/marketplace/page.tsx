import Link from "next/link";
import { createListingRepo } from "../api/shared";
import PublicListingCard from "../../components/public-listing-card";
import PublicMarketplaceSearchForm from "../../components/public-marketplace-search-form";
import PublicSiteFooter from "../../components/public-site-footer";
import PublicSiteNavbar from "../../components/public-site-navbar";
import { buildPublicListingFilter, type PublicMarketplaceSearchParams } from "../public-site-data";

type MarketplacePageProps = {
  searchParams?: Promise<PublicMarketplaceSearchParams>;
};

export default async function MarketplacePage({ searchParams }: MarketplacePageProps): Promise<React.ReactElement> {
  const params = await searchParams;
  const listingRepo = createListingRepo();
  const items = await listingRepo.listPublicListings(buildPublicListingFilter(params));

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f2e8_0%,#fffdf8_20%,#ffffff_100%)] text-slate-950">
      <PublicSiteNavbar />

      <section className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,#ffd9a8_0%,transparent_35%),radial-gradient(circle_at_top_right,#c9e5ff_0%,transparent_28%)]">
        <div className="mx-auto max-w-7xl px-6 py-14 lg:px-10 lg:py-16">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Marketplace publique</p>
              <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-[-0.05em] text-slate-950 lg:text-5xl">
                Recherchez tous les logements publiés depuis une page dédiée.
              </h1>
              <p className="mt-4 text-base leading-8 text-slate-600 lg:text-lg">
                Cette page reprend les mêmes filtres que l'accueil, mais avec la liste complète des résultats. La recherche lancée depuis la landing page arrive directement ici.
              </p>
            </div>
            <Link href="/" className="inline-flex rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700">
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">Résultats</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-950">{items.length} logement{items.length > 1 ? "s" : ""} publié{items.length > 1 ? "s" : ""}</h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-slate-500">
            Filtrez par ville, type de bien et fourchette de loyer pour afficher uniquement les logements qui correspondent à la recherche.
          </p>
        </div>

        <PublicMarketplaceSearchForm action="/marketplace" values={params} submitLabel="Rechercher" resetHref="/marketplace" />

        <div className="mt-8">
          {items.length === 0 ? (
            <div className="rounded-4xl border border-dashed border-slate-300 bg-white px-6 py-12 text-sm text-slate-500">
              Aucun logement ne correspond à cette recherche. Essayez une autre ville, élargissez la fourchette de loyer ou retirez certains filtres.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
              {items.map((item) => (
                <PublicListingCard key={item.listing.id} item={item} compact />
              ))}
            </div>
          )}
        </div>
      </section>

      <PublicSiteFooter />
    </main>
  );
}