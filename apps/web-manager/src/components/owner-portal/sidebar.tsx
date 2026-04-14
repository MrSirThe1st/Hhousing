"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/owner-portal/dashboard", label: "Vue generale" },
  { href: "/owner-portal/dashboard/properties", label: "Biens" },
  { href: "/owner-portal/dashboard/payments", label: "Paiements" },
  { href: "/owner-portal/dashboard/reports", label: "Rapports" }
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/owner-portal/dashboard") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function OwnerPortalSidebar(): React.ReactElement {
  const pathname = usePathname();

  return (
    <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:p-5">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Owner portal</p>
      <h2 className="mt-2 text-lg font-semibold text-slate-950">Navigation</h2>

      <nav className="mt-5 flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex shrink-0 items-center rounded-xl px-3 py-2 text-sm font-medium transition lg:flex ${
                active
                  ? "bg-[#0063fe] text-white"
                  : "border border-slate-200 text-slate-700 hover:border-[#0063fe] hover:text-[#0063fe]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
