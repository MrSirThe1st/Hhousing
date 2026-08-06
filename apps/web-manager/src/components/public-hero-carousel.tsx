"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

const APP_STORE_URL =
  process.env.NEXT_PUBLIC_TENANT_APP_STORE_URL?.trim()
  || "https://apps.apple.com/app/hhousing";
const PLAY_STORE_URL =
  process.env.NEXT_PUBLIC_TENANT_PLAY_STORE_URL?.trim()
  || "https://play.google.com/store/apps/details?id=com.hhousing.tenant";

const AUTOPLAY_MS = 6000;

/** Compact right-side visual pane — never taller than the CTA column needs. */
const VISUAL_PANE =
  "relative mx-auto h-[18rem] w-full max-w-md sm:h-[20rem] lg:h-[22rem] lg:max-w-none";

type SlideCta =
  | { kind: "link"; label: string; href: string }
  | { kind: "stores" };

type Slide = {
  id: string;
  eyebrow: string;
  headline: string;
  support: string;
  cta: SlideCta;
  visual: "dashboard" | "catalogue" | "tenant";
};

const SLIDES: Slide[] = [
  {
    id: "management",
    eyebrow: "Gestion locative",
    headline: "Gérez vos biens immobiliers plus simplement.",
    support:
      "Centralisez vos propriétés, locataires, paiements et interventions dans une seule plateforme.",
    cta: { kind: "link", label: "Créer un compte", href: "/signup" },
    visual: "dashboard"
  },
  {
    id: "catalogue",
    eyebrow: "Annonces",
    headline: "Trouvez votre prochain logement facilement.",
    support:
      "Découvrez des biens disponibles et connectez-vous avec des propriétaires et gestionnaires fiables.",
    cta: { kind: "link", label: "Voir les logements disponibles", href: "/marketplace" },
    visual: "catalogue"
  },
  {
    id: "tenant",
    eyebrow: "Application locataire",
    headline: "Une meilleure expérience pour les locataires.",
    support:
      "Recevez vos informations, suivez vos demandes et communiquez facilement avec votre gestionnaire.",
    cta: { kind: "stores" },
    visual: "tenant"
  }
];

function DashboardVisual(): React.ReactElement {
  return (
    <div className={`${VISUAL_PANE} flex items-center justify-center`}>
      <div className="absolute -inset-3 rounded-3xl bg-[#0063FE]/25 blur-2xl" aria-hidden="true" />
      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-white/15 bg-white shadow-2xl shadow-black/30">
        <div className="flex shrink-0 items-center gap-2.5 border-b border-slate-100 bg-slate-50 px-3 py-2.5">
          <div className="flex gap-1" aria-hidden="true">
            <span className="h-2 w-2 rounded-full bg-red-400" />
            <span className="h-2 w-2 rounded-full bg-yellow-400" />
            <span className="h-2 w-2 rounded-full bg-green-400" />
          </div>
          <span className="text-[11px] font-medium text-slate-500">Tableau de bord</span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden p-3 sm:p-4">
          <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-gradient-to-r from-blue-50 to-cyan-50 px-3 py-2.5">
            <div>
              <p className="text-[10px] text-slate-500">Loyers du mois</p>
              <p className="mt-0.5 text-xl font-bold text-slate-900">2,450,000 FC</p>
            </div>
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Contrats", value: "24" },
              { label: "Paiements", value: "18" },
              { label: "En retard", value: "3", accent: true }
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg border border-slate-100 bg-white p-2">
                <p className="text-[10px] text-slate-500">{stat.label}</p>
                <p className={`mt-0.5 text-lg font-bold ${stat.accent ? "text-amber-600" : "text-slate-900"}`}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2.5 rounded-lg border border-slate-50 bg-slate-50/80 p-2">
                <div className="h-8 w-8 shrink-0 rounded-md bg-gradient-to-br from-[#0063FE] to-cyan-400" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2 w-24 rounded bg-slate-200" />
                  <div className="h-1.5 w-16 rounded bg-slate-100" />
                </div>
                <div className="h-4 w-4 rounded-full bg-emerald-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CatalogueVisual(): React.ReactElement {
  return (
    <div className={`${VISUAL_PANE} overflow-hidden rounded-2xl border border-white/15 shadow-2xl shadow-black/30`}>
      <div className="absolute -inset-3 rounded-3xl bg-[#0063FE]/20 blur-2xl" aria-hidden="true" />
      <Image
        src="/brand/cover.png"
        alt="Exemple de bien immobilier disponible"
        fill
        sizes="(max-width: 1024px) 100vw, 40vw"
        className="object-cover"
        priority
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#010A19]/95 via-[#010A19]/40 to-transparent p-4 pt-16">
        <div className="rounded-xl border border-white/10 bg-white/95 p-3 shadow-lg backdrop-blur-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-900">Appartement · Gombe</p>
              <p className="mt-0.5 text-xs text-slate-500">3 chambres · 120 m²</p>
            </div>
            <p className="shrink-0 text-sm font-bold text-[#0063FE]">850$ / mois</p>
          </div>
        </div>
      </div>
    </div>
  );
}

type PhoneScreen = "home" | "payments";

function PhoneScreenContent({ variant }: { variant: PhoneScreen }): React.ReactElement {
  if (variant === "payments") {
    return (
      <div className="flex h-full flex-col bg-gradient-to-b from-[#0063FE] to-[#010A19] px-3 pb-4 pt-9">
        <p className="text-[10px] font-medium text-blue-100">Paiements</p>
        <p className="mt-1 text-base font-bold text-white">Historique</p>
        <div className="mt-3 space-y-2">
          {[
            { label: "Loyer · Mars", amount: "450$" },
            { label: "Loyer · Février", amount: "450$" },
            { label: "Caution", amount: "900$" }
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between rounded-lg bg-white/12 px-2.5 py-2">
              <span className="text-[10px] text-white/90">{row.label}</span>
              <span className="text-[10px] font-bold text-white">{row.amount}</span>
            </div>
          ))}
        </div>
        <div className="mt-auto rounded-lg bg-emerald-400/20 px-2.5 py-2 text-center text-[10px] font-semibold text-emerald-200">
          À jour
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white px-3 pb-4 pt-9">
      <div className="rounded-xl bg-[#0063FE] p-3 text-white">
        <p className="text-[10px] font-medium text-blue-100">Bonjour</p>
        <p className="mt-0.5 text-sm font-bold">Votre logement</p>
        <p className="mt-1.5 text-[10px] text-blue-100">Avenue de la Paix · Kinshasa</p>
      </div>
      <div className="mt-2.5 space-y-1.5">
        {["Paiements", "Demandes", "Messages"].map((label) => (
          <div key={label} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2">
            <div className="h-6 w-6 rounded-md bg-[#0063FE]/10" />
            <p className="text-[11px] font-semibold text-slate-800">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PhoneFrame({
  children,
  className = "",
  rotate = 0
}: {
  children: React.ReactNode;
  className?: string;
  rotate?: number;
}): React.ReactElement {
  return (
    <div
      className={`relative ${className}`}
      style={rotate ? { transform: `rotate(${rotate}deg)` } : undefined}
    >
      <div className="relative h-full w-full rounded-[1.85rem] bg-gradient-to-br from-slate-300 via-slate-500 to-slate-700 p-[2px] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.55)]">
        <div className="relative h-full w-full overflow-hidden rounded-[1.75rem] bg-[#0a0a0a] p-[7px]">
          <span className="absolute -left-[2px] top-[18%] h-6 w-[2px] rounded-l-sm bg-slate-500" aria-hidden="true" />
          <span className="absolute -left-[2px] top-[28%] h-10 w-[2px] rounded-l-sm bg-slate-500" aria-hidden="true" />
          <span className="absolute -left-[2px] top-[42%] h-10 w-[2px] rounded-l-sm bg-slate-500" aria-hidden="true" />
          <span className="absolute -right-[2px] top-[30%] h-12 w-[2px] rounded-r-sm bg-slate-500" aria-hidden="true" />
          <div className="relative h-full w-full overflow-hidden rounded-[1.45rem] bg-white">
            <div className="absolute left-1/2 top-2 z-20 h-[18px] w-[72px] -translate-x-1/2 rounded-full bg-black" aria-hidden="true">
              <span className="absolute right-2.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[#1a1a2e]" />
            </div>
            {children}
            <div className="absolute bottom-1 left-1/2 z-20 h-0.5 w-16 -translate-x-1/2 rounded-full bg-black/25" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TenantVisual(): React.ReactElement {
  return (
    <div className={`${VISUAL_PANE} flex items-end justify-center gap-3 sm:gap-4`}>
      <div className="absolute inset-0 rounded-3xl bg-[#0063FE]/20 blur-2xl" aria-hidden="true" />
      <PhoneFrame className="mb-6 hidden aspect-[9/19.5] h-[90%] w-auto sm:block" rotate={-6}>
        <PhoneScreenContent variant="payments" />
      </PhoneFrame>
      <PhoneFrame className="relative z-10 aspect-[9/19.5] h-full w-auto">
        <PhoneScreenContent variant="home" />
      </PhoneFrame>
    </div>
  );
}

function SlideVisual({ kind }: { kind: Slide["visual"] }): React.ReactElement {
  if (kind === "dashboard") return <DashboardVisual />;
  if (kind === "catalogue") return <CatalogueVisual />;
  return <TenantVisual />;
}

function StoreButtons(): React.ReactElement {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <a
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-12 items-center justify-center gap-2.5 rounded-lg bg-white px-5 text-sm font-semibold text-[#010A19] shadow-lg transition hover:bg-slate-100"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
        </svg>
        App Store
      </a>
      <a
        href={PLAY_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-12 items-center justify-center gap-2.5 rounded-lg border border-white/30 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.5,12.92 20.16,13.19L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
        </svg>
        Google Play
      </a>
    </div>
  );
}

export default function PublicHeroCarousel(): React.ReactElement {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const regionId = useId();
  const sectionRef = useRef<HTMLElement | null>(null);
  const indexRef = useRef(0);

  const slideCount = SLIDES.length;
  const slide = SLIDES[index] ?? SLIDES[0];

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  function goTo(next: number): void {
    setIndex(((next % slideCount) + slideCount) % slideCount);
  }

  function goPrev(): void {
    goTo(indexRef.current - 1);
  }

  function goNext(): void {
    goTo(indexRef.current + 1);
  }

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    function sync(): void {
      setReducedMotion(media.matches);
    }
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (paused || reducedMotion) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slideCount);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [paused, reducedMotion, slideCount]);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      }
    }

    node.addEventListener("keydown", onKeyDown);
    return () => node.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <section
      ref={sectionRef}
      tabIndex={0}
      aria-roledescription="carousel"
      aria-label="Présentation Haraka Property"
      aria-describedby={regionId}
      className="relative overflow-x-hidden bg-[#010A19] outline-none focus-visible:ring-2 focus-visible:ring-[#0063FE] focus-visible:ring-offset-2 focus-visible:ring-offset-[#010A19]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(0,99,254,0.45),_transparent_55%),radial-gradient(ellipse_at_bottom_left,_rgba(0,99,254,0.2),_transparent_50%)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.55) 1px, transparent 0)",
          backgroundSize: "28px 28px"
        }}
        aria-hidden="true"
      />

      <p id={regionId} className="sr-only">
        Diapositive {index + 1} sur {slideCount}. Utilisez les flèches pour naviguer.
      </p>

      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-8 px-6 py-12 lg:grid-cols-2 lg:gap-10 lg:px-10 lg:py-16">
        {/* Copy → CTA → arrows: natural flow, always fully visible, same slot every slide */}
        <div className="flex flex-col">
          <div key={slide.id} className="hero-carousel-fade min-h-[10.5rem] sm:min-h-[12rem]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">
              {slide.eyebrow}
            </p>
            <h1 className="mt-3 max-w-xl text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl md:text-[2.75rem] md:leading-tight">
              {slide.headline}
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-blue-100/90 sm:text-lg">
              {slide.support}
            </p>
          </div>

          <div className="mt-7 shrink-0">
            <div key={`cta-${slide.id}`} className="hero-carousel-fade flex min-h-12 items-center">
              {slide.cta.kind === "stores" ? (
                <StoreButtons />
              ) : (
                <Link
                  href={slide.cta.href}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-white px-6 text-sm font-semibold text-[#0063FE] shadow-lg shadow-black/20 transition hover:bg-slate-100 sm:px-8 sm:text-base"
                >
                  {slide.cta.label}
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              )}
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={goPrev}
                aria-label="Diapositive précédente"
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/25 text-white transition hover:border-white/50 hover:bg-white/10"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="Diapositive suivante"
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/25 text-white transition hover:border-white/50 hover:bg-white/10"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <span className="ml-2 text-sm font-medium tabular-nums text-white/80" aria-live="polite">
                {index + 1}/{slideCount}
              </span>
            </div>
          </div>
        </div>

        <div key={`visual-${slide.id}`} className="hero-carousel-fade" aria-hidden="true">
          <SlideVisual kind={slide.visual} />
        </div>
      </div>
    </section>
  );
}
