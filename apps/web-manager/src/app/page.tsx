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
    <main className="min-h-screen bg-white text-slate-950">
      <PublicSiteNavbar />

      <section className="relative overflow-hidden border-b border-slate-100">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/40 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-32">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm">
                <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                Plateforme professionnelle
              </div>
              <h1 className="mt-6 max-w-2xl text-5xl font-bold leading-tight tracking-tight text-slate-900 lg:text-6xl">
                Gérez votre parc locatif en toute simplicité
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
                Centralisez la gestion de vos biens immobiliers : baux, paiements, maintenance, communication locataires et diffusion d'annonces depuis une seule plateforme moderne.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link href="/signup" className="inline-flex items-center gap-2 rounded-lg bg-[#0063FE] px-8 py-4 text-base font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-[#0052d4] hover:shadow-xl hover:shadow-blue-500/30">
                  Démarrer gratuitement
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </Link>
                <Link href="/marketplace" className="inline-flex items-center gap-2 rounded-lg border-2 border-slate-200 bg-white px-8 py-4 text-base font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                  Explorer les annonces
                </Link>
              </div>
              <div className="mt-12 flex items-center gap-8 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  Gratuit pour démarrer
                </div>
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  Aucune carte requise
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 blur-3xl" />
              <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <div className="h-3 w-3 rounded-full bg-red-400" />
                      <div className="h-3 w-3 rounded-full bg-yellow-400" />
                      <div className="h-3 w-3 rounded-full bg-green-400" />
                    </div>
                    <div className="text-xs font-medium text-slate-500">Dashboard</div>
                  </div>
                </div>
                <div className="space-y-3 p-6">
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-gradient-to-r from-blue-50 to-cyan-50 p-4">
                    <div>
                      <div className="text-sm text-slate-600">Revenus du mois</div>
                      <div className="mt-1 text-2xl font-bold text-slate-900">2,450,000 FC</div>
                    </div>
                    <div className="rounded-lg bg-emerald-100 p-3 text-emerald-600">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg border border-slate-200 bg-white p-4">
                      <div className="text-xs text-slate-500">Baux actifs</div>
                      <div className="mt-1 text-xl font-bold">24</div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-4">
                      <div className="text-xs text-slate-500">Paiements</div>
                      <div className="mt-1 text-xl font-bold">18</div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-4">
                      <div className="text-xs text-slate-500">En retard</div>
                      <div className="mt-1 text-xl font-bold text-amber-600">3</div>
                    </div>
                  </div>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500" />
                      <div className="flex-1">
                        <div className="h-3 w-24 rounded bg-slate-200" />
                        <div className="mt-1.5 h-2 w-16 rounded bg-slate-100" />
                      </div>
                      <div className="h-6 w-6 rounded-full bg-emerald-100" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="use-cases" className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700">
              Pour tous les acteurs
            </div>
            <h2 className="mt-6 text-4xl font-bold tracking-tight text-slate-900">Conçu pour chaque profil</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
              Une plateforme complète qui répond aux besoins de chaque acteur de l'écosystème locatif
            </p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {USE_CASES.map((useCase, i) => (
              <article key={useCase.title} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-blue-200 hover:shadow-xl">
                <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 opacity-0 blur-2xl transition group-hover:opacity-100" />
                <div className="relative">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white font-bold text-lg">{i + 1}</div>
                  <h3 className="mt-4 text-xl font-bold text-slate-900">{useCase.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{useCase.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700">
              Fonctionnalités complètes
            </div>
            <h2 className="mt-6 text-4xl font-bold tracking-tight text-slate-900">Tout ce dont vous avez besoin</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
              Des outils professionnels pour gérer efficacement votre activité locative
            </p>
          </div>
          <div className="mt-16 grid gap-8 lg:grid-cols-3">
            {FEATURE_GROUPS.map((group, i) => (
              <article key={group.title} className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className={`inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${i === 0 ? 'from-blue-500 to-cyan-500' : i === 1 ? 'from-violet-500 to-purple-500' : 'from-amber-500 to-orange-500'} text-white`}>
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="mt-6 text-2xl font-bold text-slate-900">{group.title}</h3>
                <p className="mt-3 text-slate-600">{group.description}</p>
                <ul className="mt-6 space-y-3">
                  {group.items.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-slate-600">
                      <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-4 py-2 text-xs font-semibold text-violet-700">
              Tarifs transparents
            </div>
            <h2 className="mt-6 text-4xl font-bold tracking-tight text-slate-900">Choisissez votre formule</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
              Des plans adaptés à la taille de votre portefeuille immobilier
            </p>
          </div>
          <div className="mt-16 grid gap-8 lg:grid-cols-3">
            {PRICING_TIERS.map((tier, i) => (
              <article key={tier.name} className={`relative overflow-hidden rounded-2xl border-2 bg-white p-8 shadow-lg ${i === 1 ? 'border-blue-500 ring-4 ring-blue-100' : 'border-slate-200'}`}>
                {i === 1 && (
                  <div className="absolute right-6 top-6 rounded-full bg-blue-500 px-3 py-1 text-xs font-bold text-white">
                    Populaire
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{tier.name}</h3>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-5xl font-bold tracking-tight text-slate-900">{tier.price}</span>
                  </div>
                  <p className="mt-4 text-sm text-slate-600">{tier.description}</p>
                </div>
                <ul className="mt-8 space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-slate-600">
                      <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className={`mt-8 block rounded-lg px-6 py-3 text-center text-sm font-semibold transition ${i === 1 ? 'bg-blue-500 text-white hover:bg-blue-600' : 'border-2 border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50'}`}>
                  {i === 1 ? 'Commencer maintenant' : 'Choisir cette formule'}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="marketplace" className="py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-4 py-2 text-xs font-semibold text-cyan-700">
              Annonces disponibles
            </div>
            <h2 className="mt-6 text-4xl font-bold tracking-tight text-slate-900">Trouvez votre prochain logement</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
              Parcourez les annonces publiées par nos gestionnaires partenaires
            </p>
          </div>

          <div className="mt-12">
            <PublicMarketplaceSearchForm action="/marketplace" submitLabel="Rechercher" compact />
          </div>

          {items.length === 0 ? (
            <div className="mt-12 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 text-slate-400">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
              </div>
              <p className="mt-4 text-sm font-medium text-slate-600">Aucun logement disponible pour le moment</p>
              <p className="mt-2 text-sm text-slate-500">Revenez bientôt pour découvrir de nouvelles annonces</p>
            </div>
          ) : (
            <>
              <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {previewItems.map((item) => (
                  <PublicListingCard
                    key={item.listing.id}
                    item={item}
                    compact
                    showShareActions={false}
                  />
                ))}
              </div>
              <div className="mt-12 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {items.length} logement{items.length > 1 ? "s" : ""} disponible{items.length > 1 ? "s" : ""}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">Explorez toutes les annonces sur notre marketplace</p>
                </div>
                <Link href="/marketplace" className="inline-flex items-center gap-2 rounded-lg bg-[#0063FE] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-[#0052d4]">
                  Voir tout
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      <section id="faq" className="bg-slate-50 py-20">
        <div className="mx-auto max-w-4xl px-6 lg:px-10">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-700">
              Besoin d'aide ?
            </div>
            <h2 className="mt-6 text-4xl font-bold tracking-tight text-slate-900">Questions fréquentes</h2>
            <p className="mx-auto mt-4 text-lg text-slate-600">
              Tout ce que vous devez savoir sur Hhousing
            </p>
          </div>
          <div className="mt-12 space-y-4">
            {FAQS.map((item) => (
              <details key={item.question} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-200">
                <summary className="flex cursor-pointer items-center justify-between text-lg font-semibold text-slate-900">
                  {item.question}
                  <svg className="h-5 w-5 flex-shrink-0 text-slate-400 transition group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </summary>
                <p className="mt-4 text-slate-600 leading-relaxed">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <PublicSiteFooter />
    </main>
  );
}
