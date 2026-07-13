"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SidebarAccess } from "./sidebar";
import LogoutButton from "./logout-button";
import { isNavHrefHiddenInIndividualExperience } from "../lib/individual-experience";

interface BottomNavigationProps {
  access: SidebarAccess;
  currentRoleLabel: string;
  isIndividualExperience: boolean;
}

export default function BottomNavigation({
  access,
  currentRoleLabel,
  isIndividualExperience
}: BottomNavigationProps): React.ReactElement {
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Scroll lock when drawer is open
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

  const handleLinkClick = () => {
    setIsDrawerOpen(false);
  };

  function isItemVisible(href: string, visible: boolean): boolean {
    if (!visible) {
      return false;
    }

    if (isIndividualExperience && isNavHrefHiddenInIndividualExperience(href)) {
      return false;
    }

    return true;
  }

  const financesHref = isIndividualExperience ? "/dashboard/payments" : "/dashboard/revenues";
  const servicesHref = isIndividualExperience ? "/dashboard/documents" : "/dashboard/maintenance";
  const servicesLabel = isIndividualExperience ? "Documents" : "Services";

  const navItems = [
    {
      href: "/dashboard",
      label: "Vue d'ensemble",
      icon: (active: boolean) => (
        <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" className={active ? "text-[#0063fe]" : "text-slate-500"} />
          <rect x="13.5" y="3.5" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.8" className={active ? "text-[#0063fe]" : "text-slate-500"} />
          <rect x="13.5" y="11.5" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.8" className={active ? "text-[#0063fe]" : "text-slate-500"} />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" className={active ? "text-[#0063fe]" : "text-slate-500"} />
        </svg>
      ),
      visible: access.dashboard,
    },
    {
      href: "/dashboard/properties",
      label: "Portfolio",
      icon: (active: boolean) => (
        <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
          <path d="M4 20.5V9.5L12 4l8 5.5v11" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className={active ? "text-[#0063fe]" : "text-slate-500"} />
          <path d="M9 20.5v-5h6v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={active ? "text-[#0063fe]" : "text-slate-500"} />
        </svg>
      ),
      visible: access.operations,
    },
    {
      href: financesHref,
      label: "Finances",
      icon: (active: boolean) => (
        <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
          <path d="M4 18.5h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={active ? "text-[#0063fe]" : "text-slate-500"} />
          <path d="M6.5 15l4-4 3 2.5 4.5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={active ? "text-[#0063fe]" : "text-slate-500"} />
          <path d="M15.5 8.5H18v2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={active ? "text-[#0063fe]" : "text-slate-500"} />
        </svg>
      ),
      visible: access.finances,
    },
    {
      href: servicesHref,
      label: servicesLabel,
      icon: (active: boolean) => (
        <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
          <path d="M14.5 6.5a3 3 0 0 1 3.9 3.9l-7.8 7.8-4.6 1 1-4.6 7.5-7.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className={active ? "text-[#0063fe]" : "text-slate-500"} />
          <path d="M13 8l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={active ? "text-[#0063fe]" : "text-slate-500"} />
        </svg>
      ),
      visible: access.services,
    },
  ];

  const menuItems = [
    { href: "/dashboard/clients", label: "Propriétaires", icon: "clients", visible: access.operations },
    { href: "/dashboard/tenants", label: "Locataires", icon: "tenants", visible: access.operations },
    { href: "/dashboard/leases", label: "Baux", icon: "leases", visible: access.operations },
    { href: "/dashboard/listings", label: "Listings", icon: "listings", visible: access.operations },
    { href: "/dashboard/move-outs", label: "Départs", icon: "move-outs", visible: access.operations },
    { href: "/dashboard/expenses", label: "Dépenses", icon: "expenses", visible: access.finances },
    { href: "/dashboard/invoices", label: "Factures", icon: "invoices", visible: access.finances },
    { href: "/dashboard/reports", label: "Rapports", icon: "reports", visible: access.finances },
    { href: "/dashboard/payments", label: "Paiements", icon: "payments", visible: access.finances },
    { href: "/dashboard/documents", label: "Documents", icon: "documents", visible: access.services },
    { href: "/dashboard/team", label: "Équipe", icon: "team", visible: access.organization },
    { href: "/dashboard/audit", label: "Audit", icon: "audit", visible: access.audit },
    { href: "/dashboard/organization", label: "Organisation", icon: "organization", visible: access.manageOrganization && !isIndividualExperience },
    { href: "/dashboard/profile", label: "Mon Profil", icon: "profile", visible: true },
  ];

  return (
    <>
      {/* Bottom Nav Bar */}
      <nav 
        className="fixed bottom-0 inset-x-0 w-full max-w-full z-50 bg-white border-t border-slate-200 flex md:hidden items-center justify-around h-16 pb-[env(safe-area-inset-bottom)] select-none"
        style={{ transform: "translateZ(0)" }}
      >
        {navItems.filter((item) => isItemVisible(item.href, item.visible)).map((item) => {
          const isActive = item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleLinkClick}
              className="flex flex-col items-center justify-center flex-1 h-full min-h-[44px] min-w-[44px] active:scale-95 transition-transform"
            >
              {item.icon(isActive)}
              <span className={`text-[10px] mt-0.5 font-medium ${isActive ? "text-[#0063fe]" : "text-slate-500"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Menu/More Toggle Trigger */}
        <button
          type="button"
          onClick={() => setIsDrawerOpen(prev => !prev)}
          className="flex flex-col items-center justify-center flex-1 h-full min-h-[44px] min-w-[44px] active:scale-95 transition-transform"
          aria-expanded={isDrawerOpen}
          aria-label="Ouvrir le menu de navigation"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
            <circle cx="5" cy="12" r="2" stroke="currentColor" strokeWidth="1.8" className={isDrawerOpen ? "text-[#0063fe]" : "text-slate-500"} />
            <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.8" className={isDrawerOpen ? "text-[#0063fe]" : "text-slate-500"} />
            <circle cx="19" cy="12" r="2" stroke="currentColor" strokeWidth="1.8" className={isDrawerOpen ? "text-[#0063fe]" : "text-slate-500"} />
          </svg>
          <span className={`text-[10px] mt-0.5 font-medium ${isDrawerOpen ? "text-[#0063fe]" : "text-slate-500"}`}>
            Menu
          </span>
        </button>
      </nav>

      {/* Drawer Overlay Backdrop */}
      {isDrawerOpen && (
        <div
          onClick={() => setIsDrawerOpen(false)}
          className="fixed inset-0 z-45 bg-slate-900/40 transition-opacity duration-300 md:hidden"
          style={{ transform: "translateZ(0)" }}
          aria-hidden="true"
        />
      )}

      {/* Slide-up Menu Drawer */}
      <div
        className={`fixed bottom-0 inset-x-0 w-full max-w-full z-50 bg-white border-t border-slate-200 rounded-t-2xl max-h-[85vh] overflow-y-auto shadow-xl transition-transform duration-300 ease-out will-change-transform pb-[calc(4rem+env(safe-area-inset-bottom))] md:hidden ${
          isDrawerOpen ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ transform: isDrawerOpen ? "translateY(0) translateZ(0)" : "translateY(100%) translateZ(0)" }}
      >
        {/* Safe drag handle indicator */}
        <div className="flex justify-center py-2" onClick={() => setIsDrawerOpen(false)}>
          <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
        </div>

        {/* Drawer Header */}
        <div className="px-5 pb-3 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">Menu</h3>
            <p className="text-xs text-slate-500">{currentRoleLabel}</p>
          </div>
          <button
            onClick={() => setIsDrawerOpen(false)}
            className="p-2 rounded-full hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600"
            aria-label="Fermer le menu"
          >
            ✕
          </button>
        </div>

        {/* Grid menu list */}
        <div className="p-4 grid grid-cols-3 gap-3">
          {menuItems.filter((item) => isItemVisible(item.href, item.visible)).map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleLinkClick}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center min-h-[80px] active:scale-95 ${
                  isActive
                    ? "bg-blue-50/50 border-[#0063fe]/20 text-[#0063fe] font-medium"
                    : "border-slate-100 bg-slate-50/30 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className="mb-2">
                  <MenuIcon name={item.icon} active={isActive} />
                </span>
                <span className="text-xs truncate w-full">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Quick actions & Logout at bottom of drawer */}
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">haraka property mobile v1.0</span>
          <div className="min-h-[44px] flex items-center">
            <LogoutButton />
          </div>
        </div>
      </div>
    </>
  );
}

function MenuIcon({ name, active }: { name: string; active: boolean }): React.ReactElement | null {
  const strokeColor = active ? "text-[#0063fe]" : "text-slate-500";
  const strokeWidth = "1.8";

  switch (name) {
    case "clients":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={`h-6 w-6 ${strokeColor}`} aria-hidden="true">
          <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth={strokeWidth} />
          <path d="M4.5 18.5c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
          <path d="M16 10.5c1.9 0 3.5 1.6 3.5 3.5" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
          <path d="M15 5.5c1.4.2 2.5 1.4 2.5 2.9" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
        </svg>
      );
    case "tenants":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={`h-6 w-6 ${strokeColor}`} aria-hidden="true">
          <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth={strokeWidth} />
          <path d="M5.5 19c0-3.2 2.9-5.5 6.5-5.5s6.5 2.3 6.5 5.5" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
        </svg>
      );
    case "leases":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={`h-6 w-6 ${strokeColor}`} aria-hidden="true">
          <path d="M7 3.5h7l4 4v13H7z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
          <path d="M14 3.5v4h4" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
          <path d="M9.5 12h5M9.5 15.5h5" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
        </svg>
      );
    case "listings":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={`h-6 w-6 ${strokeColor}`} aria-hidden="true">
          <path d="M5 18.5V5.5h14v13" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
          <path d="M8 9.5h8M8 13h5" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
          <path d="M12 18.5l2.4-2.4a1.8 1.8 0 0 0 0-2.5 1.8 1.8 0 0 0-2.5 0l-.4.4-.4-.4a1.8 1.8 0 0 0-2.5 2.5L12 18.5Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
        </svg>
      );
    case "move-outs":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={`h-6 w-6 ${strokeColor}`} aria-hidden="true">
          <path d="M14 20.5H7V3.5h10v8" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
          <path d="M9.5 9h5M9.5 12.5h3" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
          <path d="M13.5 17.5h7M17.5 14.5l3 3-3 3" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "expenses":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={`h-6 w-6 ${strokeColor}`} aria-hidden="true">
          <path d="M4 18.5h16" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
          <path d="M6.5 9 10.5 13l3-2.5L18 15" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15.5 15H18v-2.5" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "invoices":
    case "payments":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={`h-6 w-6 ${strokeColor}`} aria-hidden="true">
          <rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" strokeWidth={strokeWidth} />
          <path d="M4 10h16" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
          <path d="M8 14.5h3" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
        </svg>
      );
    case "reports":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={`h-6 w-6 ${strokeColor}`} aria-hidden="true">
          <path d="M7 4.5h10v15H7z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
          <path d="M10 9h4M10 12.5h4M10 16h2" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
        </svg>
      );
    case "documents":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={`h-6 w-6 ${strokeColor}`} aria-hidden="true">
          <path d="M8 3.5h6l4 4v9.5A3.5 3.5 0 0 1 14.5 20.5H8.5A3.5 3.5 0 0 1 5 17V7a3.5 3.5 0 0 1 3-3.5Z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
          <path d="M14 3.5v4h4" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
          <path d="M9 13.5h6" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
        </svg>
      );
    case "team":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={`h-6 w-6 ${strokeColor}`} aria-hidden="true">
          <circle cx="8.5" cy="9" r="2.5" stroke="currentColor" strokeWidth={strokeWidth} />
          <circle cx="15.5" cy="8" r="2" stroke="currentColor" strokeWidth={strokeWidth} />
          <path d="M4.5 18c0-2.2 1.9-4 4.2-4h.6c2.3 0 4.2 1.8 4.2 4" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
          <path d="M14.5 17c.2-1.6 1.5-2.8 3.1-2.8h.2c1 0 1.8.4 2.4 1.1" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
        </svg>
      );
    case "audit":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={`h-6 w-6 ${strokeColor}`} aria-hidden="true">
          <path d="M6 4.5h12M6 9h12M6 13.5h6" stroke="currentColor" strokeLinecap="round" strokeWidth={strokeWidth} />
          <circle cx="16.5" cy="16.5" r="3.5" stroke="currentColor" strokeWidth={strokeWidth} />
          <path d="M19 19l2 2" stroke="currentColor" strokeLinecap="round" strokeWidth={strokeWidth} />
        </svg>
      );
    case "organization":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={`h-6 w-6 ${strokeColor}`} aria-hidden="true">
          <rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth={strokeWidth} />
          <path d="M9 3v18M15 3v18M4 8h16M4 13h16M4 17h16" stroke="currentColor" strokeWidth={strokeWidth} />
        </svg>
      );
    case "profile":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={`h-6 w-6 ${strokeColor}`} aria-hidden="true">
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth={strokeWidth} />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" />
        </svg>
      );
    default:
      return null;
  }
}
