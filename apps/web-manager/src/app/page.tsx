import Link from "next/link";
import { createListingRepo } from "./api/shared";
import PublicListingCard from "../components/public-listing-card";
import PublicMarketplaceSearchForm from "../components/public-marketplace-search-form";
import PublicSiteFooter from "../components/public-site-footer";
import PublicSiteNavbar from "../components/public-site-navbar";
import {
  FAQS,
  FEATURE_GROUPS,
  MARKETPLACE_PREVIEW_LIMIT,
  PRICING_TIERS,
  USE_CASES
} from "./public-site-data";

export default async function HomePage(): Promise<React.ReactElement> {
  const listingRepo = createListingRepo();
  const items = await listingRepo.listPublicListings({ featuredOnly: false });
  const previewItems = items.slice(0, MARKETPLACE_PREVIEW_LIMIT);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f2e8_0%,#fffdf8_20%,#ffffff_100%)] text-slate-950">
      <PublicSiteNavbar />

      <section className="relative overflow-hidden border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,#ffd9a8_0%,transparent_38%),radial-gradient(circle_at_top_right,#c9e5ff_0%,transparent_30%)]">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Plateforme d'exploitation locative</p>
              <h1 className="mt-4 max-w-4xl text-5xl font-semibold leading-tight tracking-[-0.05em] text-slate-950 lg:text-6xl">
                Gérez baux, loyers, maintenance, messages et annonces publiques depuis un seul outil.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                Hhousing met en avant votre produit dès l'accueil, puis enchaîne vers l'exploitation réelle du parc. La marketplace reste visible, mais le coeur reste la gestion opérationnelle des biens, unités et locataires.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/signup" className="rounded-full bg-[#0063FE] px-6 py-3 text-sm font-semibold text-white">Créer mon espace</Link>
                <Link href="/marketplace" className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700">Voir les annonces</Link>
              </div>
              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
                  <p className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">Tout-en-un</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Portefeuille, baux, communication et diffusion des annonces dans une seule surface opérationnelle.</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
                  <p className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">Pensé en français</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Conçu pour les usages RDC, les opérateurs locaux et une administration locative praticable au quotidien.</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
                  <p className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">Public + interne</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Publiez seulement ce que le locataire doit voir, tout en gardant une fiche bien complète côté exploitation.</p>
                </div>
              </div>
            </div>

            <div className="rounded-4xl border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Vue d'ensemble</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Ce que les équipes pilotent dans Hhousing</h2>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#0063FE]">Produit d'abord</span>
              </div>
              <div className="mt-6 grid gap-3">
                {[
                  "Pages publiques d'annonces et candidatures",
                  "Workflow d'entrée, bail et onboarding",
                  "Suivi des paiements et préparation des récurrences",
                  "Cycle de maintenance et continuité des échanges"
                ].map((item) => (
                  <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="use-cases" className="mx-auto max-w-7xl px-6 py-14 lg:px-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">Cas d'usage</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-950">Pensé pour chaque rôle de la boucle locative</h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-slate-500">Le produit couvre à la fois la découverte publique, les workflows opérateurs et la trajectoire future vers la visibilité propriétaire et la continuité locataire.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {USE_CASES.map((useCase) => (
            <article key={useCase.title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-lg font-semibold text-slate-950">{useCase.title}</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">{useCase.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="features" className="border-y border-slate-200 bg-white/80">
        <div className="mx-auto max-w-7xl px-6 py-14 lg:px-10">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">Fonctionnalités</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-950">Une vraie profondeur opérationnelle derrière la vitrine publique</h2>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {FEATURE_GROUPS.map((group) => (
              <article key={group.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-xl font-semibold text-slate-950">{group.title}</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">{group.description}</p>
                <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                  {group.items.map((feature) => (
                    <p key={feature} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">{feature}</p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-7xl px-6 py-14 lg:px-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">Tarification</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-950">Préparez la couche commerciale sans refaire toute la page</h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-slate-500">Le contenu reste provisoire, mais la structure prévoit déjà les offres par profil, les modules monétisés et la promotion payante plus tard.</p>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {PRICING_TIERS.map((tier) => (
            <article key={tier.name} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">{tier.name}</p>
              <p className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-slate-950">{tier.price}</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">{tier.description}</p>
              <div className="mt-5 space-y-2 text-sm text-slate-700">
                {tier.features.map((feature) => (
                  <p key={feature} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">{feature}</p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="marketplace" className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">Aperçu des annonces</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-950">Quelques logements déjà publiés</h2>
          </div>
          <p className="max-w-xl text-sm text-slate-500">L'accueil montre seulement un aperçu compact. La recherche complète et tous les résultats basculent vers une page publique dédiée.</p>
        </div>

        <PublicMarketplaceSearchForm action="/marketplace" submitLabel="Voir les résultats" compact />

        {items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-sm text-slate-500">
            Aucun logement publié pour le moment. Revenez plus tard ou passez directement par la page des annonces quand de nouveaux biens seront diffusés.
          </div>
        ) : (
          <>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {previewItems.map((item) => (
                <PublicListingCard
                  key={item.listing.id}
                  item={item}
                  compact
                  showShareActions={false}
                  className="w-full max-w-54"
                />
              ))}
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <p className="text-sm text-slate-600">
                {items.length} logement{items.length > 1 ? "s" : ""} publié{items.length > 1 ? "s" : ""} au total. Ouvrez la page dédiée pour voir tous les résultats et affiner la recherche.
              </p>
              <Link href="/marketplace" className="rounded-full bg-[#0063FE] px-5 py-3 text-sm font-semibold text-white">
                Voir plus
              </Link>
            </div>
          </>
        )}
      </section>

      <section id="faq" className="border-t border-slate-200 bg-white/80">
        <div className="mx-auto max-w-7xl px-6 py-14 lg:px-10">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">FAQ</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-950">Questions fréquentes avant d'adopter la plateforme</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {FAQS.map((item) => (
              <details key={item.question} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <summary className="cursor-pointer list-none text-lg font-semibold text-slate-950">{item.question}</summary>
                <p className="mt-4 text-sm leading-7 text-slate-600">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <PublicSiteFooter />
    </main>
  );
}
