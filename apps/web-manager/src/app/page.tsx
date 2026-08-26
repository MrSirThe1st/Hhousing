import type { Metadata } from "next";
import Link from "next/link";
import { createListingRepo } from "./api/shared";
import BookDemoButton from "../components/book-demo-button";
import PublicLandingHero from "../components/public-landing-hero";
import PublicMarketplaceCarousel from "../components/public-marketplace-carousel";
import PublicSiteFooter from "../components/public-site-footer";
import PublicSiteNavbar from "../components/public-site-navbar";
import PublicWhatsAppContact from "../components/public-whatsapp-contact";
import {
  FAQS,
  FEATURE_GROUPS,
  MARKETPLACE_PREVIEW_LIMIT,
  OPERATION_FEATURES,
  PORTFOLIO_TYPES,
  PRICING_TIERS,
  USE_CASES,
  WHY_HARAKA
} from "./public-site-data";

export const metadata: Metadata = {
  title: "Haraka Property — Logiciel de gestion locative en RDC",
  description:
    "Logiciel de gestion locative pour bailleurs et gestionnaires en République Démocratique du Congo : contrats, loyers, maintenance, messagerie et documents.",
  openGraph: {
    title: "Haraka Property — Logiciel de gestion locative en RDC",
    description:
      "Centralisez biens, contrats, loyers et maintenance. Pensé pour les opérateurs immobiliers en RDC.",
    type: "website",
    locale: "fr_FR"
  }
};

const APP_STORE_URL =
  process.env.NEXT_PUBLIC_TENANT_APP_STORE_URL?.trim() || "https://apps.apple.com/app/hhousing";
const PLAY_STORE_URL =
  process.env.NEXT_PUBLIC_TENANT_PLAY_STORE_URL?.trim()
  || "https://play.google.com/store/apps/details?id=com.hhousing.tenant";

export default async function HomePage(): Promise<React.ReactElement> {
  let previewItems: Awaited<ReturnType<ReturnType<typeof createListingRepo>["listPublicListings"]>>["items"] = [];
  let totalCount = 0;
  let loadError = false;
  try {
    const listingRepo = createListingRepo();
    const result = await listingRepo.listPublicListings({
      sort: "newest",
      limit: MARKETPLACE_PREVIEW_LIMIT,
      offset: 0
    });
    previewItems = result.items;
    totalCount = result.totalCount;
  } catch (error) {
    console.error("Failed to fetch public listings on homepage:", error);
    loadError = true;
  }

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <PublicSiteNavbar />
      <PublicLandingHero />

      <section id="features" className="px-4 py-12 sm:px-6 sm:py-16 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-[#1F3B63] sm:text-4xl">
              Une plateforme de gestion. Toutes vos opérations.
            </h2>
            <p className="mt-4 text-base text-slate-600 sm:text-lg">
              Loyers, maintenance, contrats, messagerie et documents — connectés pour que votre
              équipe arrête de coordonner entre dix outils.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <BookDemoButton className="inline-flex h-11 items-center justify-center rounded-lg bg-[#4A86D4] px-6 text-sm font-semibold text-white transition hover:bg-[#3B73BC]" />
              <Link
                href="/signup"
                className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Démarrer gratuitement
              </Link>
            </div>
          </div>

          <div className="mt-16 space-y-16 lg:mt-20 lg:space-y-24">
            {OPERATION_FEATURES.map((feature, index) => {
              const reversed = index % 2 === 1;
              return (
                <article
                  key={feature.id}
                  className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${
                    reversed ? "lg:[&>*:first-child]:order-2" : ""
                  }`}
                >
                  <div>
                    <h3 className="text-xl font-bold tracking-tight text-[#1F3B63] sm:text-3xl">
                      {feature.title}
                    </h3>
                    <p className="mt-4 text-base leading-relaxed text-slate-600">
                      {feature.description}
                    </p>
                    <ul className="mt-6 space-y-3">
                      {feature.items.map((item) => (
                        <li key={item} className="flex items-start gap-3 text-sm text-slate-700">
                          <svg
                            className="mt-0.5 h-5 w-5 shrink-0 text-[#4A86D4]"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div
                    className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br p-6 sm:p-8 ${
                      index % 4 === 0
                        ? "from-[#EAF2FA] to-slate-50"
                        : index % 4 === 1
                          ? "from-slate-50 to-[#EAF2FA]"
                          : index % 4 === 2
                            ? "from-[#F3F7FC] to-white"
                            : "from-white to-[#EAF2FA]"
                    }`}
                  >
                    <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#4A86D4]/10 blur-2xl" />
                    {feature.id === "rent" ? (
                      <div className="relative space-y-3">
                        <div className="rounded-xl border border-white/80 bg-white p-4 shadow-sm">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            Paiements du mois
                          </p>
                          <p className="mt-2 text-2xl font-bold text-[#1F3B63]">1 820 000 FC</p>
                          <p className="mt-1 text-xs text-emerald-600">12 reçus · 2 en attente</p>
                        </div>
                        <div className="space-y-2">
                          {[
                            { label: "Orange Money", detail: "Appartement Gombe", amount: "450 000 FC" },
                            { label: "Virement bancaire", detail: "Villa Limete", amount: "800 000 FC" },
                            { label: "M-Pesa", detail: "Studio Ngaliema", amount: "320 000 FC" }
                          ].map((row) => (
                            <div
                              key={row.label + row.detail}
                              className="flex items-center justify-between rounded-xl border border-white/80 bg-white px-3 py-2.5 shadow-sm"
                            >
                              <div>
                                <p className="text-sm font-semibold text-[#1F3B63]">{row.label}</p>
                                <p className="text-xs text-slate-500">{row.detail}</p>
                              </div>
                              <p className="text-sm font-semibold text-slate-700">{row.amount}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="relative space-y-3">
                        <div className="h-3 w-24 rounded-full bg-[#4A86D4]/30" />
                        <div className="rounded-xl border border-white/80 bg-white/90 p-4 shadow-sm">
                          <div className="h-2.5 w-2/3 rounded bg-slate-200" />
                          <div className="mt-3 h-2 w-1/2 rounded bg-slate-100" />
                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <div className="h-16 rounded-lg bg-slate-50" />
                            <div className="h-16 rounded-lg bg-slate-50" />
                          </div>
                        </div>
                        <div className="rounded-xl border border-white/80 bg-white/90 p-4 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div className="h-2.5 w-1/3 rounded bg-slate-200" />
                            <div className="h-6 w-6 rounded-full bg-emerald-100" />
                          </div>
                          <div className="mt-3 h-2 w-full rounded bg-slate-100" />
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#3A6BA8] px-4 py-12 text-white sm:px-6 sm:py-16 lg:px-10 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight sm:text-4xl">
              Conçu pour les opérateurs immobiliers en RDC
            </h2>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {WHY_HARAKA.map((item) => (
              <div key={item.title}>
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/75">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="use-cases" className="px-4 py-12 sm:px-6 sm:py-16 lg:px-10 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-[#1F3B63] sm:text-4xl">
              Adapté à votre façon d&apos;opérer
            </h2>
            <p className="mt-4 text-base text-slate-600 sm:text-lg">
              Bailleur, agence ou portefeuille mixte — Haraka Property s&apos;aligne sur votre rôle.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {USE_CASES.map((useCase) => (
              <article key={useCase.title} className="border-t-2 border-[#4A86D4] pt-5">
                <h3 className="text-lg font-bold text-[#1F3B63]">{useCase.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{useCase.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50 px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <h2 className="text-xl font-bold tracking-tight text-[#1F3B63] sm:text-3xl">
              Pour chaque type de portefeuille
            </h2>
            <p className="mt-3 text-slate-600">
              Un système pour chaque bien, chaque locataire et chaque transaction.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PORTFOLIO_TYPES.map((type) => (
              <div
                key={type.title}
                className="rounded-xl border border-slate-200 bg-white px-5 py-6 transition hover:border-[#4A86D4]/40"
              >
                <p className="font-semibold text-[#1F3B63]">{type.title}</p>
                <p className="mt-1 text-sm text-slate-500">{type.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-10 lg:py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[#1F3B63] sm:text-3xl">
              Une meilleure expérience pour vos locataires
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              Ils consultent leur bail, suivent les paiements, signalent un problème et vous
              écrivent — depuis l&apos;app mobile. Vous restez sur le tableau de bord web.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-[#3A6BA8] px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                App Store
              </a>
              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Google Play
              </a>
              <Link
                href="/mobile-app"
                className="inline-flex h-11 items-center justify-center px-2 text-sm font-semibold text-[#4A86D4] hover:underline"
              >
                En savoir plus
              </Link>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute -inset-4 rounded-[2rem] bg-[#4A86D4]/15 blur-2xl" aria-hidden="true" />
            <div className="relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-[#3A6BA8] p-3 shadow-xl">
              <div className="rounded-[1.35rem] bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Haraka · Locataire
                </p>
                <p className="mt-4 text-2xl font-bold text-[#1F3B63]">Loyer du mois</p>
                <p className="mt-1 text-sm text-slate-500">Appartement · Gombe</p>
                <div className="mt-6 rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">À régler</p>
                  <p className="mt-1 text-xl font-bold text-[#1F3B63]">850 000 FC</p>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-10 rounded-lg bg-[#4A86D4]/10" />
                  <div className="h-10 rounded-lg bg-slate-100" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PublicMarketplaceCarousel
        items={previewItems}
        totalCount={totalCount}
        loadError={loadError}
      />

      <section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-10 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-[#1F3B63] sm:text-4xl">
              Tout ce dont vous avez besoin
            </h2>
            <p className="mt-4 text-base text-slate-600 sm:text-lg">
              Des outils simples pour gérer efficacement vos locations
            </p>
          </div>
          <div className="mt-12 grid gap-8 lg:grid-cols-3">
            {FEATURE_GROUPS.map((group) => (
              <article key={group.title} className="border-t border-slate-200 pt-6">
                <h3 className="text-xl font-bold text-[#1F3B63]">{group.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{group.description}</p>
                <ul className="mt-5 space-y-2.5">
                  {group.items.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-slate-700">
                      <svg
                        className="mt-0.5 h-4 w-4 shrink-0 text-[#4A86D4]"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="border-y border-slate-200 bg-slate-50 px-4 py-12 sm:px-6 sm:py-16 lg:px-10 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-[#1F3B63] sm:text-4xl">
              Tarification simple
            </h2>
            <p className="mt-4 text-base text-slate-600 sm:text-lg">
              Gratuit sous 2 biens. Ensuite, 5$ par logement et par mois — payé en Mobile Money,
              sans prélèvement automatique.
            </p>
          </div>
          <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
            {PRICING_TIERS.map((tier) => (
              <article
                key={tier.name}
                className={`relative bg-white p-8 ${
                  tier.name === "Professionnel"
                    ? "border-2 border-[#4A86D4]"
                    : "border border-slate-200"
                }`}
              >
                {tier.name === "Professionnel" ? (
                  <p className="absolute right-6 top-6 text-xs font-bold uppercase tracking-wide text-[#4A86D4]">
                    Usage
                  </p>
                ) : null}
                <h3 className="text-lg font-bold text-[#1F3B63]">{tier.name}</h3>
                <p className="mt-4 text-4xl font-bold tracking-tight text-[#1F3B63]">{tier.price}</p>
                <p className="mt-4 text-sm leading-relaxed text-slate-600">{tier.description}</p>
                <ul className="mt-8 space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-slate-600">
                      <svg
                        className="mt-0.5 h-5 w-5 shrink-0 text-[#4A86D4]"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className="mt-8 block bg-[#4A86D4] px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#3B73BC]"
                >
                  Commencer maintenant
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <PublicWhatsAppContact />

      <section id="faq" className="px-4 py-12 sm:px-6 sm:py-16 lg:px-10 lg:py-20">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-[#1F3B63] sm:text-4xl">
              Questions fréquentes
            </h2>
            <p className="mt-4 text-base text-slate-600">
              Tout ce que vous devez savoir sur Haraka Property
            </p>
          </div>
          <div className="mt-10 space-y-3">
            {FAQS.map((item) => (
              <details
                key={item.question}
                className="group border border-slate-200 bg-white px-5 py-4 open:border-[#4A86D4]/30"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-semibold text-[#1F3B63]">
                  {item.question}
                  <svg
                    className="h-5 w-5 shrink-0 text-slate-400 transition group-open:rotate-180"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#3A6BA8] px-4 py-12 text-white sm:px-6 sm:py-16 lg:px-10 lg:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-4xl">
            Sérieux sur la gestion locative ?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/80">
            Gagnez du temps et gérez plus de logements. Voyez si Haraka Property vous convient.
          </p>
          <div className="mt-8 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center">
            <BookDemoButton className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-white px-7 text-sm font-semibold text-[#4A86D4] transition hover:bg-slate-100 sm:w-auto" />
            <Link
              href="/signup"
              className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-white/30 px-7 text-sm font-semibold text-white transition hover:bg-white/10 sm:w-auto"
            >
              Démarrer gratuitement
            </Link>
          </div>
        </div>
      </section>

      <PublicSiteFooter />
    </main>
  );
}
