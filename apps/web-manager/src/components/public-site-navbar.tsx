"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/auth-context";

type MenuId = "solutions" | "features";

const SOLUTIONS = [
  {
    title: "Propriétaires",
    description: "Suivez vos biens, loyers et locataires sans Excel ni carnets.",
    href: "/#use-cases"
  },
  {
    title: "Gestionnaires immobiliers",
    description: "Centralisez portefeuilles, équipes, paiements et interventions.",
    href: "/#use-cases"
  },
  {
    title: "Locataires",
    description: "Accédez à vos infos, demandes et échanges depuis l'application.",
    href: "/mobile-app"
  }
] as const;

const FEATURE_LINKS = [
  {
    title: "Gestion des biens",
    description: "Maisons, immeubles et logements dans une seule vue.",
    href: "/#features"
  },
  {
    title: "Gestion des locataires",
    description: "Contrats, dossiers et communication au même endroit.",
    href: "/#features"
  },
  {
    title: "Paiements",
    description: "Loyers reçus par Mobile Money ou virement, retards et suivi en un lieu.",
    href: "/#features"
  },
  {
    title: "Maintenance",
    description: "Demandes, photos et suivi jusqu'à la résolution.",
    href: "/#features"
  },
  {
    title: "Prestataires",
    description: "Trouvez et coordonnez vos intervenants de confiance.",
    href: "/#features"
  }
] as const;

const MOBILE_LINKS = [
  { href: "/#use-cases", label: "Solutions" },
  { href: "/#features", label: "Fonctionnalités" },
  { href: "/#pricing", label: "Tarifs" },
  { href: "/marketplace", label: "Catalogue" },
  { href: "/demo", label: "Réserver une démo" },
  { href: "/#contact", label: "WhatsApp" },
  { href: "/#faq", label: "FAQ" }
] as const;

export default function PublicSiteNavbar(): React.ReactElement {
  const { user, loading } = useAuth();
  const [openMenu, setOpenMenu] = useState<MenuId | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setOpenMenu(null);
        setMobileOpen(false);
      }
    }

    function handlePointerDown(event: MouseEvent | TouchEvent): void {
      const target = event.target as Node | null;
      if (!target || !headerRef.current) return;
      if (!headerRef.current.contains(target)) {
        setOpenMenu(null);
      }
    }

    window.addEventListener("keydown", handleEscape);
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  function toggleMenu(menuId: MenuId): void {
    setOpenMenu((current) => (current === menuId ? null : menuId));
  }

  function closeMenu(): void {
    setOpenMenu(null);
  }

  function closeMobile(): void {
    setMobileOpen(false);
    setOpenMenu(null);
  }

  return (
    <header
      ref={headerRef}
      className="relative sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl dark:border-slate-800 dark:bg-[#0a1120]/95"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:gap-6 lg:px-10">
        <Link
          href="/"
          onClick={closeMobile}
          className="flex shrink-0 items-center gap-2 text-[#010A19] dark:text-slate-100 sm:gap-3"
        >
          <Image
            src="/brand/haraka-pay-logo.svg"
            alt="Haraka Property"
            width={44}
            height={44}
            className="h-9 w-9 shrink-0 sm:h-11 sm:w-11"
          />
          <span className="whitespace-nowrap text-base font-semibold tracking-tight sm:text-lg">
            Haraka Property
          </span>
        </Link>

        <nav className="hidden items-center gap-0.5 xl:gap-1.5 lg:flex">
          <MenuButton
            label="Solutions"
            isOpen={openMenu === "solutions"}
            onClick={() => toggleMenu("solutions")}
          />
          <MenuButton
            label="Fonctionnalités"
            isOpen={openMenu === "features"}
            onClick={() => toggleMenu("features")}
          />
          <NavLink href="/#pricing" onClick={closeMenu}>Tarifs</NavLink>
          <NavLink href="/marketplace" onClick={closeMenu}>Catalogue</NavLink>
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {loading ? (
            <div className="hidden h-9 w-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800 sm:block sm:h-10 sm:w-40" />
          ) : user !== null ? (
            <Link
              href="/dashboard"
              onClick={closeMobile}
              className="hidden whitespace-nowrap rounded-lg bg-[#0063FE] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0052d4] sm:inline-flex"
            >
              Mon tableau de bord
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                onClick={closeMobile}
                className="hidden rounded-lg px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 sm:inline-block sm:px-5 sm:py-2.5 sm:text-sm"
              >
                Se connecter
              </Link>
              <Link
                href="/demo"
                onClick={closeMobile}
                className="hidden rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800 lg:inline-block lg:px-5 lg:py-2.5 lg:text-sm"
              >
                Réserver une démo
              </Link>
              <Link
                href="/signup"
                onClick={closeMobile}
                className="hidden rounded-lg bg-[#0063FE] px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-[#0052d4] sm:inline-block sm:px-6 sm:py-2.5 sm:text-sm"
              >
                Créer un compte
              </Link>
            </>
          )}

          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-800 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800 lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls="public-mobile-menu"
            aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
            onClick={() => setMobileOpen((current) => !current)}
          >
            {mobileOpen ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Desktop mega panel */}
      <div
        className={`absolute left-0 right-0 top-full z-50 hidden border-b border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.12)] transition duration-150 dark:border-slate-800 dark:bg-[#0a1120] lg:block ${
          openMenu
            ? "visible translate-y-0 opacity-100"
            : "pointer-events-none invisible -translate-y-1 opacity-0"
        }`}
        aria-hidden={openMenu === null}
      >
        <div className="mx-auto max-w-7xl px-6 py-6 lg:px-10">
          {openMenu === "solutions" ? <SolutionsPanel onNavigate={closeMenu} /> : null}
          {openMenu === "features" ? <FeaturesPanel onNavigate={closeMenu} /> : null}
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        id="public-mobile-menu"
        className={`border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0a1120] lg:hidden ${
          mobileOpen ? "block" : "hidden"
        }`}
      >
        <div className="max-h-[min(78vh,40rem)] overflow-y-auto px-4 py-4 sm:px-6">
          <nav className="space-y-1">
            {MOBILE_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobile}
                className="block rounded-lg px-3 py-3 text-base font-semibold text-slate-800 transition hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-5 space-y-2 border-t border-slate-200 pt-5 dark:border-slate-700">
            {loading ? (
              <div className="h-11 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            ) : user !== null ? (
              <Link
                href="/dashboard"
                onClick={closeMobile}
                className="flex h-11 items-center justify-center rounded-lg bg-[#0063FE] px-4 text-sm font-semibold text-white transition hover:bg-[#0052d4]"
              >
                Mon tableau de bord
              </Link>
            ) : (
              <>
                <Link
                  href="/signup"
                  onClick={closeMobile}
                  className="flex h-11 items-center justify-center rounded-lg bg-[#0063FE] px-4 text-sm font-semibold text-white transition hover:bg-[#0052d4]"
                >
                  Créer un compte
                </Link>
                <Link
                  href="/login"
                  onClick={closeMobile}
                  className="flex h-11 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  Se connecter
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function MenuButton({
  label,
  isOpen,
  onClick
}: {
  label: string;
  isOpen: boolean;
  onClick: () => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={isOpen}
      className={`inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
        isOpen
          ? "bg-slate-100 text-slate-950 dark:bg-slate-800 dark:text-white"
          : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
      }`}
    >
      {label}
      <svg
        className={`h-3.5 w-3.5 transition ${isOpen ? "rotate-180" : ""}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}

function NavLink({
  href,
  onClick,
  children
}: {
  href: string;
  onClick?: () => void;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      {children}
    </Link>
  );
}

function SolutionsPanel({ onNavigate }: { onNavigate: () => void }): React.ReactElement {
  return (
    <div>
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Solutions</p>
        <p className="mt-2 text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
          Une plateforme adaptée à votre rôle
        </p>
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        {SOLUTIONS.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            onClick={onNavigate}
            className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:border-blue-200 hover:bg-blue-50/60 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-blue-800 dark:hover:bg-blue-950/30"
          >
            <p className="text-sm font-semibold text-slate-950 dark:text-white">{item.title}</p>
            <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-400">{item.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function FeaturesPanel({ onNavigate }: { onNavigate: () => void }): React.ReactElement {
  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Fonctionnalités</p>
          <p className="mt-2 text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
            Des bénéfices concrets au quotidien
          </p>
        </div>
        <Link
          href="/#features"
          onClick={onNavigate}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Tout voir
        </Link>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURE_LINKS.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            onClick={onNavigate}
            className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:border-blue-200 hover:bg-blue-50/60 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-blue-800 dark:hover:bg-blue-950/30"
          >
            <p className="text-sm font-semibold text-slate-950 dark:text-white">{item.title}</p>
            <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-400">{item.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
