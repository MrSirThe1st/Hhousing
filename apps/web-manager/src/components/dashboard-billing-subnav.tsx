"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard/billing", label: "Aperçu", exact: true },
  { href: "/dashboard/billing/invoices", label: "Factures Haraka", exact: false },
  { href: "/dashboard/billing/payments", label: "Paiements", exact: false },
  { href: "/dashboard/billing/settings", label: "Paramètres", exact: false }
] as const;

export default function DashboardBillingSubnav(): React.ReactElement {
  const pathname = usePathname();

  return (
    <nav
      className="flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800"
      aria-label="Sections abonnement Haraka"
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
