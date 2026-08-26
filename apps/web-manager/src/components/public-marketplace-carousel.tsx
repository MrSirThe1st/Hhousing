"use client";

import Link from "next/link";
import { useRef } from "react";
import type { PublicListingView } from "@hhousing/api-contracts";
import PublicListingCard from "./public-listing-card";

interface PublicMarketplaceCarouselProps {
  items: PublicListingView[];
  totalCount: number;
  loadError?: boolean;
}

export default function PublicMarketplaceCarousel({
  items,
  totalCount,
  loadError = false
}: PublicMarketplaceCarouselProps): React.ReactElement {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  function scrollByCards(direction: -1 | 1): void {
    const node = scrollerRef.current;
    if (!node) return;
    const cardWidth = node.querySelector<HTMLElement>("[data-carousel-card]")?.offsetWidth ?? 280;
    node.scrollBy({ left: direction * (cardWidth + 16), behavior: "smooth" });
  }

  return (
    <section id="marketplace" className="border-y border-slate-200/80 bg-slate-50 py-10 sm:py-14 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0063FE]">
              Catalogue (optionnel)
            </p>
            <h2 className="mt-3 text-xl font-bold tracking-tight text-[#010A19] sm:text-3xl">
              Quelques logements disponibles
            </h2>
            <p className="mt-2 text-base text-slate-600">
              Publiez une annonce quand vous le souhaitez — la gestion reste le cœur du produit.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!loadError && totalCount > 0 ? (
              <Link
                href="/marketplace"
                className="mr-2 text-sm font-semibold text-[#0063FE] transition hover:text-[#0052d4]"
              >
                Voir tout ({totalCount})
              </Link>
            ) : null}
            {items.length > 0 ? (
              <>
                <button
                  type="button"
                  onClick={() => scrollByCards(-1)}
                  aria-label="Annonces précédentes"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => scrollByCards(1)}
                  aria-label="Annonces suivantes"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            ) : null}
          </div>
        </div>

        {loadError ? (
          <p className="mt-8 text-sm text-slate-600">
            Impossible de charger les annonces pour le moment.{" "}
            <Link href="/marketplace" className="font-semibold text-[#0063FE]">
              Ouvrir le catalogue
            </Link>
          </p>
        ) : items.length === 0 ? (
          <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-6 sm:flex-row sm:items-center">
            <p className="text-sm text-slate-600">
              Aucune annonce publique pour le moment. Vous pouvez gérer vos biens sans publier.
            </p>
            <Link
              href="/signup"
              className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#0063FE] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0052d4]"
            >
              Créer un compte
            </Link>
          </div>
        ) : (
          <div
            ref={scrollerRef}
            className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {items.map((item) => (
              <div
                key={item.listing.id}
                data-carousel-card
                className="w-[min(18.5rem,78vw)] shrink-0 snap-start sm:w-[19.5rem]"
              >
                <PublicListingCard item={item} compact showShareActions={false} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
