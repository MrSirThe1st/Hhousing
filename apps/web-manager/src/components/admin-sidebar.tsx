"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./logout-button";
import { SIDEBAR_SET_COLLAPSED_EVENT, SIDEBAR_STORAGE_KEY } from "./sidebar-collapse";
import { SidebarIcon, type IconName } from "./sidebar-icons";

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  exact?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Plateforme",
    items: [{ href: "/admin", label: "Vue d'ensemble", icon: "dashboard", exact: true }]
  },
  {
    title: "Gestion",
    items: [
      { href: "/admin/users", label: "Utilisateurs", icon: "team" },
      { href: "/admin/organizations", label: "Organisations", icon: "organizations" },
      { href: "/admin/service-providers", label: "Prestataires", icon: "maintenance" }
    ]
  },
  {
    title: "Système",
    items: [
      { href: "/admin/billing", label: "Facturation", icon: "payments" },
      { href: "/admin/audit", label: "Audit", icon: "audit" }
    ]
  }
];

export default function AdminSidebar(): React.ReactElement {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const storedState = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (storedState === "1") {
      setIsCollapsed(true);
    }

    function handleSetCollapsed(event: Event): void {
      const customEvent = event as CustomEvent<{ isCollapsed?: boolean }>;
      if (typeof customEvent.detail?.isCollapsed === "boolean") {
        setIsCollapsed(customEvent.detail.isCollapsed);
      }
    }

    window.addEventListener(SIDEBAR_SET_COLLAPSED_EVENT, handleSetCollapsed as EventListener);

    return () => {
      window.removeEventListener(SIDEBAR_SET_COLLAPSED_EVENT, handleSetCollapsed as EventListener);
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, isCollapsed ? "1" : "0");
  }, [isCollapsed]);

  const shellWidthClassName = isCollapsed ? "w-[5.25rem]" : "w-[17.75rem]";

  return (
    <aside
      className={`hidden md:flex h-full shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white text-[#010a19] transition-[width] duration-300 dark:border-slate-800 dark:bg-[#0d1526] dark:text-slate-100 ${shellWidthClassName}`}
    >
      <div className="border-b border-slate-200 px-3 py-3 dark:border-slate-800">
        <div className={`flex min-w-0 flex-1 items-center ${isCollapsed ? "justify-center px-1 py-1" : "gap-3 px-2 py-1.5"}`}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-sm font-semibold uppercase text-[#10213d] ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700">
            HP
          </div>
          {!isCollapsed ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#10213d] dark:text-slate-100">Haraka Property</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">Admin plateforme</p>
            </div>
          ) : null}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-6">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              {!isCollapsed ? (
                <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500 dark:text-slate-400">
                  {section.title}
                </p>
              ) : null}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = item.exact
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group flex items-center ${isCollapsed ? "justify-center px-2" : "gap-3 px-3"} rounded-lg py-2.5 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-[#f2f6fb] text-[#0f2748] dark:bg-slate-800 dark:text-white"
                          : "text-[#243b5a] hover:bg-slate-50 hover:text-[#010a19] dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-white"
                      }`}
                      aria-label={isCollapsed ? item.label : undefined}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <span
                        className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition ${
                          isActive
                            ? "bg-white text-[#0063fe] ring-1 ring-[#d9e7ff] dark:bg-slate-900 dark:ring-slate-700"
                            : "text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        <SidebarIcon name={item.icon} active={isActive} />
                      </span>
                      {!isCollapsed ? <span className="min-w-0 flex-1 truncate">{item.label}</span> : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      <div className={`border-t border-slate-200 py-3 dark:border-slate-800 ${isCollapsed ? "flex justify-center px-2" : "px-3"}`}>
        {isCollapsed ? (
          <LogoutButton compact />
        ) : (
          <div className="[&>div]:w-full [&_button]:w-full">
            <LogoutButton />
          </div>
        )}
      </div>
    </aside>
  );
}
