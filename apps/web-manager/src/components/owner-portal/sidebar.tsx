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
    <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-8 lg:h-[calc(100vh-4rem)]">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Owner Portal</h2>
        <p className="mt-1 text-lg font-semibold text-[#010a19]">Navigation</p>
      </div>

      <nav className="mt-6 flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-2 lg:overflow-visible">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex shrink-0 items-center rounded-lg px-4 py-2.5 text-sm font-semibold transition lg:w-full ${
                active
                  ? "bg-[#0063fe] text-white shadow-sm"
                  : "text-slate-700 hover:bg-slate-50"
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
