"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isV1DeferredNavHref } from "../../lib/v1-deferred-features";
import { SidebarIcon, type IconName } from "../sidebar-icons";

const NAV_ITEMS: ReadonlyArray<{ href: string; label: string; icon: IconName }> = [
  { href: "/owner-portal/dashboard", label: "Vue générale", icon: "dashboard" },
  { href: "/owner-portal/dashboard/properties", label: "Biens", icon: "portfolio" },
  { href: "/owner-portal/dashboard/payments", label: "Paiements", icon: "payments" },
  { href: "/owner-portal/dashboard/reports", label: "Rapports", icon: "reports" }
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/owner-portal/dashboard") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function visibleNavItems() {
  return NAV_ITEMS.filter((item) => !isV1DeferredNavHref(item.href));
}

export default function OwnerPortalSidebar(): React.ReactElement {
  const pathname = usePathname();
  const items = visibleNavItems();

  return (
    <aside className="hidden md:flex h-full w-56 shrink-0 flex-col overflow-hidden bg-white text-[#010a19] dark:bg-[#0d1526] dark:text-slate-100">
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-slate-200 px-3 dark:border-slate-800">
        <img
          src="/brand/haraka-pay-logo.svg"
          alt="Haraka Property"
          className="h-7 w-7 shrink-0 rounded-md object-contain bg-white p-0.5 ring-1 ring-slate-200 dark:ring-slate-700"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold leading-tight text-[#10213d] dark:text-slate-100">
            Espace propriétaire
          </p>
          <p className="truncate text-[11px] leading-tight text-slate-500 dark:text-slate-400">
            Lecture seule
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col border-r border-slate-200 dark:border-slate-800">
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
            Navigation
          </p>
          <div className="space-y-0.5">
            {items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-2.5 rounded-md px-2.5 py-2.5 text-sm font-medium leading-none transition-colors ${
                    active
                      ? "bg-[#f2f6fb] text-[#0f2748] dark:bg-slate-800 dark:text-white"
                      : "text-[#243b5a] hover:bg-slate-50 hover:text-[#010a19] dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-white"
                  }`}
                >
                  <span
                    className={`flex shrink-0 items-center justify-center ${
                      active ? "text-[#0063fe]" : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    <SidebarIcon name={item.icon} active={active} className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </aside>
  );
}

export function OwnerPortalMobileNav(): React.ReactElement {
  const pathname = usePathname();
  const items = visibleNavItems();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 md:hidden dark:border-slate-800 dark:bg-[#0d1526]">
      <div className="mx-auto flex max-w-lg items-stretch justify-around gap-1">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2 text-[11px] font-semibold transition ${
                active
                  ? "text-[#0063fe]"
                  : "text-slate-500 hover:text-[#010a19] dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <SidebarIcon name={item.icon} active={active} className="h-5 w-5" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
