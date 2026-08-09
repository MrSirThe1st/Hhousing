"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const TABS = [
  { href: "/dashboard/prestataires", label: "Par bien", exact: true },
  { href: "/dashboard/prestataires/catalogue", label: "Catalogue", exact: false },
  { href: "/dashboard/prestataires/mes-prestataires", label: "Mes artisans", exact: false }
] as const;

export default function PrestatairesSubnav(): React.ReactElement {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const propertyId = searchParams.get("propertyId");
  const query = propertyId ? `?propertyId=${encodeURIComponent(propertyId)}` : "";

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800" aria-label="Sections artisans et services">
      {TABS.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={`${tab.href}${query}`}
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
