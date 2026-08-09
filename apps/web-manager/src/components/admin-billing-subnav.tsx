"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/billing", label: "Aperçu", exact: true },
  { href: "/admin/billing/invoices", label: "Factures", exact: false },
  { href: "/admin/billing/payments", label: "Paiements", exact: false },
  { href: "/admin/billing/settings", label: "Paramètres", exact: false }
] as const;

export default function AdminBillingSubnav(): React.ReactElement {
  const pathname = usePathname();

  return (
    <nav
      className="flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800"
      aria-label="Sections facturation admin"
    >
      {TABS.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "border-[#0063fe] text-[#0063fe]"
                : "border-transparent text-slate-500 hover:text-[#010a19] dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
