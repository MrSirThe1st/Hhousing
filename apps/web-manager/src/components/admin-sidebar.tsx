"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./logout-button";

const NAV_ITEMS: Array<{ href: string; label: string; exact?: boolean }> = [
  { href: "/admin", label: "Vue d'ensemble", exact: true },
  { href: "/admin/users", label: "Utilisateurs" },
  { href: "/admin/organizations", label: "Organisations" },
  { href: "/admin/audit", label: "Audit" }
];

export default function AdminSidebar(): React.ReactElement {
  const pathname = usePathname();

  return (
    <aside className="flex w-full flex-col border-b border-slate-200 bg-white md:h-screen md:w-64 md:shrink-0 md:border-b-0 md:border-r dark:border-slate-800 dark:bg-[#0d1526]">
      <div className="px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">hhousing</p>
        <h1 className="mt-1 text-lg font-semibold text-[#010a19] dark:text-white">Admin plateforme</h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Contrôle SaaS interne</p>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-[#010a19] text-white dark:bg-white dark:text-[#010a19]"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 px-4 py-4 dark:border-slate-800">
        <LogoutButton />
      </div>
    </aside>
  );
}
