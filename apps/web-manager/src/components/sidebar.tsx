"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Organization } from "@hhousing/domain";
import { isNavHrefHiddenInIndividualExperience } from "../lib/individual-experience";
import LogoutButton from "./logout-button";
import { SIDEBAR_SET_COLLAPSED_EVENT, SIDEBAR_STORAGE_KEY } from "./sidebar-collapse";
import { SidebarIcon, type IconName } from "./sidebar-icons";

export type SidebarAccess = {
  dashboard: boolean;
  operations: boolean;
  finances: boolean;
  services: boolean;
  organization: boolean;
  audit: boolean;
  billing: boolean;
  manageOrganization: boolean;
};

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  badgeCount?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface SidebarProps {
  currentRoleLabel: string;
  access: SidebarAccess;
  isIndividualExperience: boolean;
}

interface SidebarBadgeCounts {
  listings: number;
  payments: number;
  maintenance: number;
  messages: number;
}

function createEmptyBadgeCounts(): SidebarBadgeCounts {
  return {
    listings: 0,
    payments: 0,
    maintenance: 0,
    messages: 0
  };
}

function getOrganizationInitials(name?: string): string {
  const source = name?.trim();
  if (!source) {
    return "HH";
  }

  const letters = source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return letters.toUpperCase();
}

export default function Sidebar({ currentRoleLabel, access, isIndividualExperience }: SidebarProps): React.ReactElement {
  const pathname = usePathname();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [badgeCounts, setBadgeCounts] = useState<SidebarBadgeCounts>(createEmptyBadgeCounts);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const baseNavSections: NavSection[] = [
    {
      title: "Tableau de bord",
      items: [{ href: "/dashboard", label: "Vue d'ensemble", icon: "dashboard" }]
    },
    {
      title: "Locations",
      items: [
        { href: "/dashboard/properties", label: "Mes biens", icon: "portfolio" },
        { href: "/dashboard/clients", label: "Propriétaires", icon: "clients" },
        { href: "/dashboard/listings", label: "Annonces", icon: "listings", badgeCount: badgeCounts.listings },
        { href: "/dashboard/tenants", label: "Locataires", icon: "tenants" },
        { href: "/dashboard/leases", label: "Contrats", icon: "leases" },
        { href: "/dashboard/move-outs", label: "Fin de location", icon: "move-outs" }
      ]
    },
    {
      title: "Finances",
      items: [
        { href: "/dashboard/revenues", label: "Revenus", icon: "revenues" },
        { href: "/dashboard/expenses", label: "Dépenses", icon: "expenses" },
        { href: "/dashboard/reports", label: "Rapports", icon: "reports" },
        { href: "/dashboard/payments", label: "Paiements", icon: "payments", badgeCount: badgeCounts.payments },
        { href: "/dashboard/invoices", label: "Factures", icon: "payments" }
      ]
    },
    {
      title: "Services",
      items: [
        { href: "/dashboard/maintenance", label: "Réparations", icon: "maintenance", badgeCount: badgeCounts.maintenance },
        { href: "/dashboard/prestataires", label: "Prestataires", icon: "team" },
        { href: "/dashboard/documents", label: "Documents", icon: "documents" }
      ]
    },
    {
      title: "Organisation",
      items: [
        { href: "/dashboard/team", label: "Équipe", icon: "team" },
        { href: "/dashboard/billing", label: "Facturation", icon: "payments" },
        { href: "/dashboard/audit", label: "Audit", icon: "audit" }
      ]
    }
  ];

  const navSections: NavSection[] = baseNavSections.map((section) => {
    if (section.title === "Tableau de bord" && !access.dashboard) {
      return { ...section, items: [] };
    }

    if (section.title === "Locations" && !access.operations) {
      return { ...section, items: [] };
    }

    if (section.title === "Finances" && !access.finances) {
      return { ...section, items: [] };
    }

    if (section.title === "Services" && !access.services) {
      return { ...section, items: [] };
    }

    if (section.title === "Organisation") {
      const items = section.items.filter((item) => {
        if (item.href === "/dashboard/team") {
          return access.organization;
        }

        if (item.href === "/dashboard/billing") {
          return access.billing;
        }

        if (item.href === "/dashboard/audit") {
          return access.audit;
        }

        return true;
      });

      return { ...section, items };
    }

    return section;
  }).map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (isIndividualExperience && isNavHrefHiddenInIndividualExperience(item.href)) {
        return false;
      }
      return true;
    })
  })).filter((section) => section.items.length > 0);

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

  useEffect(() => {
    let cancelled = false;

    async function fetchOrganization(): Promise<void> {
      const response = await fetch("/api/organization", { credentials: "include" });
      if (!response.ok) {
        return;
      }

      const result = await response.json() as { success: boolean; data?: { organization: Organization } };
      if (!cancelled && result.success && result.data) {
        setOrganization(result.data.organization);
      }
    }

    void fetchOrganization();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchBadgeCounts(): Promise<void> {
      const response = await fetch("/api/sidebar/badge-counts", {
        credentials: "include",
        cache: "no-store"
      });

      if (!response.ok) {
        return;
      }

      const result = await response.json() as {
        success: boolean;
        data?: SidebarBadgeCounts;
      };

      if (!cancelled && result.success && result.data) {
        setBadgeCounts(result.data);
      }
    }

    void fetchBadgeCounts();

    return () => {
      cancelled = true;
    };
  }, []);

  const organizationSubtitle = organization?.contactEmail ?? organization?.contactPhone ?? currentRoleLabel;
  const shellWidthClassName = isCollapsed ? "w-[5.25rem]" : "w-[17.75rem]";

  const orgSettingsHref = access.manageOrganization || isIndividualExperience
    ? "/dashboard/profile?tab=organisation"
    : null;

  return (
    <aside
      className={`hidden md:flex h-full shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white text-[#010a19] transition-[width] duration-300 dark:border-slate-800 dark:bg-[#0d1526] dark:text-slate-100 ${shellWidthClassName}`}
    >
      {/* Top: organisation block */}
      <div className="border-b border-slate-200 px-3 py-3 dark:border-slate-800">
        {orgSettingsHref ? (
          <Link
            href={orgSettingsHref}
            className={`flex min-w-0 flex-1 items-center rounded-lg transition hover:bg-slate-50 dark:hover:bg-slate-800/60 ${isCollapsed ? "justify-center px-1 py-1" : "gap-3 px-2 py-1.5"}`}
            aria-label={isIndividualExperience ? "Paramètres" : "Organisation"}
            title={isCollapsed ? (isIndividualExperience ? "Paramètres" : "Organisation") : undefined}
          >
            {organization?.logoUrl ? (
              <img src={organization.logoUrl} alt={organization.name} className="h-9 w-9 shrink-0 rounded-md object-contain bg-white p-1 ring-1 ring-slate-200 dark:ring-slate-700" />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-sm font-semibold uppercase text-[#10213d] ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700">
                {getOrganizationInitials(organization?.name)}
              </div>
            )}
            {!isCollapsed ? (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#10213d] dark:text-slate-100">{organization?.name ?? "Organisation"}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{organizationSubtitle}</p>
              </div>
            ) : null}
          </Link>
        ) : (
          <div className={`flex min-w-0 flex-1 items-center ${isCollapsed ? "justify-center px-1 py-1" : "gap-3 px-2 py-1.5"}`}>
            {organization?.logoUrl ? (
              <img src={organization.logoUrl} alt={organization.name} className="h-9 w-9 shrink-0 rounded-md object-contain bg-white p-1 ring-1 ring-slate-200 dark:ring-slate-700" />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-sm font-semibold uppercase text-[#10213d] ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700">
                {getOrganizationInitials(organization?.name)}
              </div>
            )}
            {!isCollapsed ? (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#10213d] dark:text-slate-100">{organization?.name ?? "Organisation"}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{organizationSubtitle}</p>
              </div>
            ) : null}
          </div>
        )}
      </div>


      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-6">
          {navSections.map((section) => (
            <div key={section.title}>
              {!isCollapsed ? (
                <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500 dark:text-slate-400">
                  {section.title}
                </p>
              ) : null}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive =
                    item.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname.startsWith(item.href);
                  const badgeLabel = typeof item.badgeCount === "number" && item.badgeCount > 0
                    ? item.badgeCount.toLocaleString("fr-FR")
                    : null;

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
                      <span className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition ${isActive ? "bg-white text-[#0063fe] ring-1 ring-[#d9e7ff] dark:bg-slate-900 dark:ring-slate-700" : "text-slate-500 dark:text-slate-400"}`}>
                        <SidebarIcon name={item.icon} active={isActive} />
                        {isCollapsed && badgeLabel !== null ? (
                          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-[#0063fe] px-1.5 py-0.5 text-center text-[10px] font-semibold leading-none text-white">
                            {badgeLabel}
                          </span>
                        ) : null}
                      </span>
                      {!isCollapsed ? (
                        <>
                          <span className="min-w-0 flex-1 truncate">{item.label}</span>
                          {badgeLabel !== null ? (
                            <span className={`rounded-full px-2 py-1 text-[11px] font-semibold leading-none ${isActive ? "bg-white text-[#0063fe] ring-1 ring-[#d9e7ff] dark:bg-slate-900 dark:ring-slate-700" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                              {badgeLabel}
                            </span>
                          ) : null}
                        </>
                      ) : null}
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
