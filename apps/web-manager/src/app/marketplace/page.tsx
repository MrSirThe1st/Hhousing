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
    <main className="min-h-screen bg-white text-slate-950">
      <PublicSiteNavbar />

      <section className="border-b border-slate-100 bg-gradient-to-b from-blue-50/40 to-transparent">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-20">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm">
                <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                Annonces disponibles
              </div>
              <h1 className="mt-6 text-5xl font-bold leading-tight tracking-tight text-slate-900 lg:text-6xl">
                Trouvez le logement idéal
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-slate-600">
                Parcourez {items.length} annonce{items.length > 1 ? "s" : ""} de logements disponibles et trouvez celui qui correspond à vos besoins.
              </p>
            </div>
            <Link href="/" className="inline-flex items-center gap-2 rounded-lg border-2 border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 lg:px-10 lg:py-16">
        <div className="mb-8">
          <PublicMarketplaceSearchForm action="/marketplace" values={params} submitLabel="Rechercher" resetHref="/marketplace" />
        </div>

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{items.length} logement{items.length > 1 ? "s" : ""} trouvé{items.length > 1 ? "s" : ""}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {params ? "Résultats filtrés selon vos critères" : "Tous les logements disponibles"}
            </p>
          </div>
        </div>

        <div>
          {items.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-20 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-200 text-slate-400">
                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <h3 className="mt-6 text-lg font-semibold text-slate-900">Aucun résultat trouvé</h3>
              <p className="mt-2 text-sm text-slate-600">Essayez d'ajuster vos filtres de recherche</p>
              <Link href="/marketplace" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#0063FE] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0052d4]">
                Réinitialiser les filtres
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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