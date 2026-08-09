"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./logout-button";
import { SidebarIcon, type IconName } from "./sidebar-icons";
import ThemeToggle from "./theme-toggle";

type AdminNavItem = {
  href: string;
  label: string;
  icon: IconName;
  exact?: boolean;
};

const PRIMARY_TABS: AdminNavItem[] = [
  { href: "/admin", label: "Aperçu", icon: "dashboard", exact: true },
  { href: "/admin/users", label: "Utilisateurs", icon: "team" },
  { href: "/admin/organizations", label: "Organisations", icon: "organizations" },
  { href: "/admin/billing", label: "Abonnement Haraka", icon: "payments" }
];

const MENU_ITEMS: AdminNavItem[] = [
  { href: "/admin/service-providers", label: "Artisans et services", icon: "maintenance" },
  { href: "/admin/audit", label: "Audit", icon: "audit" }
];

function isNavActive(pathname: string, item: AdminNavItem): boolean {
  if (item.exact) {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export default function AdminBottomNavigation(): React.ReactElement {
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isDrawerOpen]);

  function handleLinkClick(): void {
    setIsDrawerOpen(false);
  }

  return (
    <>
      <nav
        className="fixed bottom-0 inset-x-0 w-full max-w-full z-50 bg-white border-t border-slate-200 flex md:hidden items-center justify-around h-16 pb-[env(safe-area-inset-bottom)] select-none dark:bg-[#0d1526] dark:border-slate-800"
        style={{ transform: "translateZ(0)" }}
      >
        {PRIMARY_TABS.map((item) => {
          const isActive = isNavActive(pathname, item);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleLinkClick}
              className="flex flex-col items-center justify-center flex-1 h-full min-h-[44px] min-w-[44px] active:scale-95 transition-transform"
            >
              <span className={isActive ? "text-[#0063fe]" : "text-slate-500 dark:text-slate-400"}>
                <SidebarIcon name={item.icon} active className="h-7 w-7" />
              </span>
              <span
                className={`w-full truncate px-0.5 text-center text-[10px] mt-1 ${
                  isActive ? "text-[#0063fe] font-medium" : "text-slate-500 font-normal dark:text-slate-400"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setIsDrawerOpen((prev) => !prev)}
          className="flex flex-col items-center justify-center flex-1 h-full min-h-[44px] min-w-[44px] active:scale-95 transition-transform"
          aria-expanded={isDrawerOpen}
          aria-label="Ouvrir le menu de navigation"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden="true">
            <circle cx="5" cy="12" r="2" stroke="currentColor" strokeWidth="1.8" className={isDrawerOpen ? "text-[#0063fe]" : "text-slate-500 dark:text-slate-400"} />
            <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.8" className={isDrawerOpen ? "text-[#0063fe]" : "text-slate-500 dark:text-slate-400"} />
            <circle cx="19" cy="12" r="2" stroke="currentColor" strokeWidth="1.8" className={isDrawerOpen ? "text-[#0063fe]" : "text-slate-500 dark:text-slate-400"} />
          </svg>
          <span className={`text-[10px] mt-1 font-normal ${isDrawerOpen ? "text-[#0063fe] font-medium" : "text-slate-500 dark:text-slate-400"}`}>
            Menu
          </span>
        </button>
      </nav>

      {isDrawerOpen ? (
        <div
          onClick={() => setIsDrawerOpen(false)}
          className="fixed inset-0 z-45 bg-slate-900/40 transition-opacity duration-300 md:hidden"
          style={{ transform: "translateZ(0)" }}
          aria-hidden="true"
        />
      ) : null}

      <div
        className={`fixed bottom-0 inset-x-0 w-full max-w-full z-50 bg-white border-t border-slate-200 rounded-t-2xl max-h-[85vh] overflow-y-auto shadow-xl transition-transform duration-300 ease-out will-change-transform pb-[calc(4rem+env(safe-area-inset-bottom))] md:hidden dark:bg-[#0d1526] dark:border-slate-800 ${
          isDrawerOpen ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ transform: isDrawerOpen ? "translateY(0) translateZ(0)" : "translateY(100%) translateZ(0)" }}
      >
        <div className="flex justify-center py-2" onClick={() => setIsDrawerOpen(false)}>
          <div className="w-12 h-1.5 bg-slate-200 rounded-full dark:bg-slate-700" />
        </div>

        <div className="px-5 pb-3 border-b border-slate-100 flex items-center justify-between dark:border-slate-800">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Menu</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Administrateur plateforme</p>
          </div>
          <button
            type="button"
            onClick={() => setIsDrawerOpen(false)}
            className="p-2 rounded-full hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Fermer le menu"
          >
            ✕
          </button>
        </div>

        <div className="p-4 grid grid-cols-3 gap-3">
          {MENU_ITEMS.map((item) => {
            const isActive = isNavActive(pathname, item);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleLinkClick}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center min-h-[80px] active:scale-95 ${
                  isActive
                    ? "bg-blue-50/50 border-[#0063fe]/20 text-[#0063fe] font-medium dark:bg-[#0063fe]/10"
                    : "border-slate-100 bg-slate-50/30 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-300 dark:hover:bg-slate-800/60"
                }`}
              >
                <span className={`mb-2 ${isActive ? "text-[#0063fe]" : "text-slate-500 dark:text-slate-400"}`}>
                  <SidebarIcon name={item.icon} active className="h-6 w-6" />
                </span>
                <span className="text-xs truncate w-full">{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between gap-3 dark:border-slate-800">
          <span className="text-xs text-slate-400 shrink-0">Haraka Admin · v1.0</span>
          <div className="min-h-[44px] flex items-center gap-2">
            <ThemeToggle />
            <LogoutButton compact />
          </div>
        </div>
      </div>
    </>
  );
}
