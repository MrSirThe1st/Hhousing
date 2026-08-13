import type { Metadata } from "next";
import Link from "next/link";
import { createListingRepo } from "../api/shared";
import PublicListingCard from "../../components/public-listing-card";
import PublicMarketplacePagination from "../../components/public-marketplace-pagination";
import PublicMarketplaceSearchForm from "../../components/public-marketplace-search-form";
import PublicSiteFooter from "../../components/public-site-footer";
import PublicSiteNavbar from "../../components/public-site-navbar";
import {
  buildMarketplaceHref,
  buildPublicListingFilter,
  firstSearchParam,
  MARKETPLACE_PAGE_SIZE,
  parseMarketplacePage,
  parseMarketplaceSort,
  type PublicMarketplaceSearchParams
} from "../public-site-data";

export const metadata: Metadata = {
  title: "Catalogue — Logements à louer en RDC — Haraka Property",
  description: "Parcourez et trouvez votre prochain logement disponible à la location en République Démocratique du Congo.",
  openGraph: {
    title: "Catalogue — Logements à louer en RDC — Haraka Property",
    description: "Parcourez et trouvez votre prochain logement disponible à la location en République Démocratique du Congo.",
    type: "website",
    locale: "fr_FR"
  }
};

type MarketplacePageProps = {
  searchParams?: Promise<PublicMarketplaceSearchParams>;
};

export default async function MarketplacePage({ searchParams }: MarketplacePageProps): Promise<React.ReactElement> {
  const params = await searchParams;
  const currentPage = parseMarketplacePage(params?.page);
  const sort = parseMarketplaceSort(params?.sort);

  let items: Awaited<ReturnType<ReturnType<typeof createListingRepo>["listPublicListings"]>>["items"] = [];
  let totalCount = 0;
  let loadError = false;

  try {
    const listingRepo = createListingRepo();
    const result = await listingRepo.listPublicListings(
      buildPublicListingFilter(params, { page: currentPage, pageSize: MARKETPLACE_PAGE_SIZE })
    );
    items = result.items;
    totalCount = result.totalCount;
  } catch (error) {
    console.error("Failed to fetch public listings on marketplace page:", error);
    loadError = true;
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / MARKETPLACE_PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * MARKETPLACE_PAGE_SIZE;
  const rangeStart = totalCount === 0 ? 0 : pageStart + 1;
  const rangeEnd = Math.min(pageStart + MARKETPLACE_PAGE_SIZE, totalCount);
  const hasActiveFilters = Boolean(
    firstSearchParam(params?.q) ||
      firstSearchParam(params?.city) ||
      firstSearchParam(params?.propertyType) ||
      firstSearchParam(params?.minRent) ||
      firstSearchParam(params?.maxRent) ||
      firstSearchParam(params?.minBedrooms) ||
      firstSearchParam(params?.minBathrooms) ||
      firstSearchParam(params?.amenities) ||
      firstSearchParam(params?.features)
  );

  const sortOptions = [
    { value: "newest", label: "Plus récent" },
    { value: "price_asc", label: "Prix : croissant" },
    { value: "price_desc", label: "Prix : décroissant" }
  ] as const;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-[#0a1120] dark:text-slate-100">
      <PublicSiteNavbar />

      <section className="relative overflow-hidden py-16 md:py-24 bg-slate-200 border-b border-slate-200/50 flex items-center justify-center min-h-[300px] dark:bg-slate-900 dark:border-slate-800">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('/brand/cover.png')",
          }}
        />
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] dark:bg-slate-950/75" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-900/20 dark:to-slate-950/20" />

        <div className="relative mx-auto max-w-7xl px-6 lg:px-10 text-center flex flex-col items-center justify-center w-full z-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight tracking-tight text-white max-w-3xl">
            Trouvez votre prochain logement
          </h1>
        </div>
      </section>

      <section className="relative z-20 mx-auto -mt-8 max-w-5xl px-6 lg:px-10">
        <PublicMarketplaceSearchForm action="/marketplace" values={params} submitLabel="Rechercher" variant="hero" />
      </section>

      <section className="mx-auto max-w-7xl px-6 pt-8 lg:px-10">
        <PublicMarketplaceSearchForm
          action="/marketplace"
          values={params}
          submitLabel="Filtrer"
          resetHref="/marketplace"
          variant="compact"
        />
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 lg:px-10 lg:py-16">
        <div className="mb-8 border-b border-slate-200/60 pb-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
            <Link href="/" className="hover:text-slate-700 transition">Accueil</Link>
            <span>/</span>
            <span className="text-[#0063FE]">Catalogue</span>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {loadError
                  ? "Impossible de charger les annonces"
                  : `${totalCount} logement${totalCount > 1 ? "s" : ""} trouvé${totalCount > 1 ? "s" : ""}`}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {loadError
                  ? "Une erreur est survenue. Veuillez réessayer dans un instant."
                  : hasActiveFilters
                    ? "Résultats filtrés selon vos critères"
                    : "Tous les logements disponibles"}
                {!loadError && totalCount > 0 ? ` · Affichage ${rangeStart}–${rangeEnd}` : null}
              </p>
            </div>

            {!loadError ? (
              <div className="flex flex-col gap-2 sm:items-end">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Trier par</span>
                <div className="flex flex-wrap gap-1.5">
                  {sortOptions.map((option) => {
                    const isActive = sort === option.value;
                    const href = buildMarketplaceHref({ ...params, sort: option.value, page: undefined }, 1);
                    return (
                      <Link
                        key={option.value}
                        href={href}
                        className={
                          isActive
                            ? "rounded-full bg-[#0063FE] px-3 py-1.5 text-xs font-semibold text-white"
                            : "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-300"
                        }
                      >
                        {option.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div>
          {loadError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-16 text-center max-w-2xl mx-auto">
              <h3 className="text-lg font-bold text-red-900">Erreur de chargement</h3>
              <p className="mt-2 text-sm text-red-700">
                Nous n&apos;avons pas pu récupérer les annonces. Ce n&apos;est pas un résultat vide — réessayez plus tard.
              </p>
              <Link href="/marketplace" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0063FE] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0052d4] shadow-sm">
                Réessayer
              </Link>
            </div>
          ) : totalCount === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center shadow-xs max-w-2xl mx-auto">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 border border-slate-100 text-slate-400">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="mt-6 text-lg font-bold text-slate-900">Aucun résultat trouvé</h3>
              <p className="mt-2 text-sm text-slate-550 max-w-md mx-auto">Nous n&apos;avons trouvé aucun bien correspondant à vos critères de recherche. Essayez d&apos;élargir votre recherche ou d&apos;ajuster les filtres.</p>
              <Link href="/marketplace" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0063FE] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0052d4] shadow-sm">
                Réinitialiser tous les filtres
              </Link>
            </div>
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((item) => (
                  <PublicListingCard key={item.listing.id} item={item} compact showShareActions={false} />
                ))}
              </div>

              {totalPages > 1 ? (
                <PublicMarketplacePagination
                  currentPage={safePage}
                  totalPages={totalPages}
                  params={params}
                />
              ) : null}
            </>
          )}
        </div>
      </section>

      <PublicSiteFooter />
    </main>
  );
}
