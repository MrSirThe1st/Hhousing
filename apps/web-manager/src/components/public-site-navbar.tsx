"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FEATURE_GROUPS, PRICING_TIERS, USE_CASES } from "../app/public-site-data";

type MenuId = "pricing" | "roles" | "features";

const MENU_ITEMS: Array<{
  id: MenuId;
  label: string;
}> = [
  { id: "pricing", label: "Tarification" },
  { id: "roles", label: "Cas d'usage" },
  { id: "features", label: "Fonctionnalités" }
];

export default function PublicSiteNavbar(): React.ReactElement {
  const [openMenu, setOpenMenu] = useState<MenuId | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setOpenMenu(null);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  function cancelClose(): void {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function scheduleClose(): void {
    cancelClose();
    closeTimerRef.current = window.setTimeout(() => {
      setOpenMenu(null);
    }, 140);
  }

  function open(menuId: MenuId): void {
    cancelClose();
    setOpenMenu(menuId);
  }

  function toggle(menuId: MenuId): void {
    cancelClose();
    setOpenMenu((current) => (current === menuId ? null : menuId));
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4 lg:px-10">
        <Link href="/" className="flex items-center gap-3 text-[#010A19]">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0063FE] text-sm font-bold text-white">HH</span>
          <span>
            <span className="block text-lg font-semibold tracking-tight">Hhousing</span>
            <span className="block text-[11px] uppercase tracking-[0.18em] text-slate-500">Opérations locatives</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-2 lg:flex">
          <Link href="/marketplace" className="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            Annonces
          </Link>

          {MENU_ITEMS.map((item) => {
            const isOpen = openMenu === item.id;

            return (
              <div
                key={item.id}
                className="relative"
                onMouseEnter={() => open(item.id)}
                onMouseLeave={scheduleClose}
              >
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  onFocus={() => open(item.id)}
                  aria-expanded={isOpen}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${isOpen ? "bg-slate-100 text-slate-950" : "text-slate-700 hover:bg-slate-100"}`}
                >
                  {item.label}
                </button>
                <div
                  className={`absolute left-1/2 top-full mt-3 -translate-x-1/2 transition duration-150 ${isOpen ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0"}`}
                  onMouseEnter={cancelClose}
                  onMouseLeave={scheduleClose}
                >
                  {item.id === "pricing" ? <PricingPanel /> : null}
                  {item.id === "roles" ? <RolesPanel /> : null}
                  {item.id === "features" ? <FeaturesPanel /> : null}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/login" className="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Connexion</Link>
          <Link href="/signup" className="rounded-full bg-[#0063FE] px-5 py-2.5 text-sm font-semibold text-white">Créer un compte</Link>
        </div>
      </div>

      <div className="border-t border-slate-200 px-4 py-3 lg:hidden">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto">
          <Link href="/marketplace" className="whitespace-nowrap rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Annonces</Link>
          <Link href="/#pricing" className="whitespace-nowrap rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Tarification</Link>
          <Link href="/#use-cases" className="whitespace-nowrap rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Cas d'usage</Link>
          <Link href="/#features" className="whitespace-nowrap rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Fonctionnalités</Link>
        </div>
      </div>
    </header>
  );
}

function PricingPanel(): React.ReactElement {
  return (
    <div className="w-[44rem] rounded-4xl border border-slate-200 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.14)]">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Tarification</p>
          <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950">Préparez l'offre commerciale sans figer le produit trop tôt</p>
        </div>
        <Link href="/#pricing" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Voir la grille</Link>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {PRICING_TIERS.map((tier) => (
          <div key={tier.name} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{tier.name}</p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{tier.price}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{tier.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RolesPanel(): React.ReactElement {
  return (
    <div className="w-[48rem] rounded-4xl border border-slate-200 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.14)]">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Cas d'usage</p>
          <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950">Une même plateforme, plusieurs rôles dans la boucle locative</p>
        </div>
        <Link href="/#use-cases" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Voir les profils</Link>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {USE_CASES.map((useCase) => (
          <div key={useCase.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-base font-semibold text-slate-950">{useCase.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{useCase.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeaturesPanel(): React.ReactElement {
  return (
    <div className="w-[52rem] rounded-4xl border border-slate-200 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.14)]">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Fonctionnalités</p>
          <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950">Des panneaux plus riches pour comprendre vite ce que couvre Hhousing</p>
        </div>
        <Link href="/#features" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Explorer</Link>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {FEATURE_GROUPS.map((group) => (
          <div key={group.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-base font-semibold text-slate-950">{group.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{group.description}</p>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              {group.items.map((feature) => (
                <p key={feature} className="rounded-2xl bg-white px-3 py-2">{feature}</p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}