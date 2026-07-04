"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { SidebarAccess } from "./sidebar";

interface FloatingActionButtonProps {
  access: SidebarAccess;
}

export default function FloatingActionButton({ access }: FloatingActionButtonProps): React.ReactElement | null {
  const [isOpen, setIsOpen] = useState(false);

  // If user doesn't have operations permissions, they can't add properties or tenants
  if (!access.operations) {
    return null;
  }

  const actions = [
    {
      href: "/dashboard/properties/add",
      label: "Bien",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
          <path d="M4 20.5V9.5L12 4l8 5.5v11" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M9 20.5v-5h6v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      color: "bg-[#0063fe]",
    },
    {
      href: "/dashboard/tenants/add",
      label: "Locataire",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
          <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="2" />
          <path d="M5.5 19c0-3.2 2.9-5.5 6.5-5.5s6.5 2.3 6.5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      color: "bg-emerald-600",
    },
    {
      href: "/dashboard/payments?add=true",
      label: "Paiement",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
          <rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
          <path d="M4 10h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M8 14.5h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      color: "bg-amber-600",
    },
  ];

  return (
    <div 
      className="fixed right-4 z-40 md:hidden select-none"
      style={{ bottom: "calc(5rem + env(safe-area-inset-bottom))" }}
    >
      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-30 bg-slate-900/30 backdrop-blur-xs"
        />
      )}

      {/* Action Sub-buttons container */}
      <div className={`flex flex-col items-end space-y-3 mb-3 transition-all duration-300 ${
        isOpen ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-10 scale-75 pointer-events-none"
      } relative z-40`}>
        {actions.map((act, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="bg-slate-900 text-white text-xs font-semibold px-2 py-1 rounded-md shadow-sm">
              {act.label}
            </span>
            <Link
              href={act.href}
              onClick={() => setIsOpen(false)}
              className={`flex h-11 w-11 items-center justify-center rounded-full text-white shadow-lg active:scale-95 transition-transform ${act.color}`}
              aria-label={`Ajouter un ${act.label}`}
            >
              {act.icon}
            </Link>
          </div>
        ))}
      </div>

      {/* Main floating circle button (min-h 44px tap target) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-all duration-300 z-40 relative active:scale-95 ${
          isOpen ? "bg-slate-800 rotate-45" : "bg-[#0063fe]"
        }`}
        aria-expanded={isOpen}
        aria-label="Actions rapides mobile"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
