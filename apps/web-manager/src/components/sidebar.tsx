"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Organization } from "@hhousing/domain";
import { isNavHrefHiddenInIndividualExperience } from "../lib/individual-experience";
import { isV1DeferredNavHref } from "../lib/v1-deferred-features";
import LogoutButton from "./logout-button";
import { SIDEBAR_SET_COLLAPSED_EVENT, SIDEBAR_STORAGE_KEY } from "./sidebar-collapse";
import { SidebarIcon, type IconName } from "./sidebar-icons";
import SidebarToggleButton from "./sidebar-toggle-button";

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
  initialOrganization?: Organization | null;
  initialBadgeCounts?: SidebarBadgeCounts;
}

interface SidebarBadgeCounts {
  listings: number;
  payments: number;
}

function createEmptyBadgeCounts(): SidebarBadgeCounts {
  return {
    listings: 0,
    payments: 0
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

export default function Sidebar({
  currentRoleLabel,
  access,
  isIndividualExperience,
  initialOrganization = null,
  initialBadgeCounts
}: SidebarProps): React.ReactElement {
  const pathname = usePathname();
  const [organization, setOrganization] = useState<Organization | null>(initialOrganization);
  const [badgeCounts, setBadgeCounts] = useState<SidebarBadgeCounts>(
    initialBadgeCounts ?? createEmptyBadgeCounts
  );
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
        { href: "/dashboard/leases", label: "Baux", icon: "leases" },
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
        { href: "/dashboard/invoices", label: "Reçus", icon: "payments" }
      ]
    },
    {
      title: "Services",
      items: [
        { href: "/dashboard/prestataires", label: "Artisans et services", icon: "team" },
        { href: "/dashboard/documents", label: "Documents", icon: "documents" }
      ]
    },
    {
      title: "Organisation",
      items: [
        { href: "/dashboard/team", label: "Équipe", icon: "team" },
        { href: "/dashboard/billing", label: "Abonnement Haraka", icon: "payments" },
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
      if (isV1DeferredNavHref(item.href)) {
        return false;
      }
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
    if (initialOrganization) {
      return;
    }

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
  }, [initialOrganization]);

  useEffect(() => {
    if (initialBadgeCounts) {
      return;
    }

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
  }, [initialBadgeCounts]);

  const organizationSubtitle = organization?.contactEmail ?? organization?.contactPhone ?? currentRoleLabel;
  const shellWidthClassName = isCollapsed ? "w-14" : "w-56";

  const orgSettingsHref = access.manageOrganization || isIndividualExperience
    ? "/dashboard/profile?tab=organisation"
    : null;

  return (
    <aside
      className={`hidden md:flex h-full shrink-0 flex-col overflow-hidden bg-white text-[#010a19] transition-[width] duration-300 dark:bg-[#0d1526] dark:text-slate-100 ${shellWidthClassName}`}
    >
      {/* Top bar segment: org + collapse control (aligns with main header) */}
      <div className="flex h-14 shrink-0 items-center gap-1 border-b border-slate-200 px-2 dark:border-slate-800">
        {isCollapsed ? (
          <div className="flex w-full items-center justify-center">
            <SidebarToggleButton />
          </div>
        ) : (
          <>
            {orgSettingsHref ? (
              <Link
                href={orgSettingsHref}
                className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-1.5 py-1 transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
                aria-label={isIndividualExperience ? "Paramètres" : "Organisation"}
              >
                {organization?.logoUrl ? (
                  <img src={organization.logoUrl} alt={organization.name} className="h-7 w-7 shrink-0 rounded-md object-contain bg-white p-0.5 ring-1 ring-slate-200 dark:ring-slate-700" />
                ) : (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-[11px] font-semibold uppercase text-[#10213d] ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700">
                    {getOrganizationInitials(organization?.name)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold leading-tight text-[#10213d] dark:text-slate-100">{organization?.name ?? "Organisation"}</p>
                  <p className="truncate text-[11px] leading-tight text-slate-500 dark:text-slate-400">{organizationSubtitle}</p>
                </div>
              </Link>
            ) : (
              <div className="flex min-w-0 flex-1 items-center gap-2.5 px-1.5 py-1">
                {organization?.logoUrl ? (
                  <img src={organization.logoUrl} alt={organization.name} className="h-7 w-7 shrink-0 rounded-md object-contain bg-white p-0.5 ring-1 ring-slate-200 dark:ring-slate-700" />
                ) : (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-[11px] font-semibold uppercase text-[#10213d] ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700">
                    {getOrganizationInitials(organization?.name)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold leading-tight text-[#10213d] dark:text-slate-100">{organization?.name ?? "Organisation"}</p>
                  <p className="truncate text-[11px] leading-tight text-slate-500 dark:text-slate-400">{organizationSubtitle}</p>
                </div>
              </div>
            )}
            <SidebarToggleButton />
          </>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col border-r border-slate-200 dark:border-slate-800">
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <div className="space-y-4">
            {navSections.map((section) => (
              <div key={section.title}>
                {!isCollapsed ? (
                  <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
                    {section.title}
                  </p>
                ) : null}
                <div className="space-y-0.5">
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
                        className={`group relative flex items-center ${isCollapsed ? "justify-center px-1.5" : "gap-2.5 px-2.5"} rounded-md py-2.5 text-sm font-medium leading-none transition-colors ${
                          isActive
                            ? "bg-[#f2f6fb] text-[#0f2748] dark:bg-slate-800 dark:text-white"
                            : "text-[#243b5a] hover:bg-slate-50 hover:text-[#010a19] dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-white"
                        }`}
                        aria-label={isCollapsed ? item.label : undefined}
                        title={isCollapsed ? item.label : undefined}
                      >
                        <span className={`relative flex shrink-0 items-center justify-center ${isActive ? "text-[#0063fe]" : "text-slate-500 dark:text-slate-400"}`}>
                          <SidebarIcon name={item.icon} active={isActive} className="h-5 w-5" />
                          {isCollapsed && badgeLabel !== null ? (
                            <span className="absolute -right-1.5 -top-1.5 min-w-3.5 rounded-full bg-[#0063fe] px-1 py-px text-center text-[9px] font-semibold leading-none text-white">
                              {badgeLabel}
                            </span>
                          ) : null}
                        </span>
                        {!isCollapsed ? (
                          <>
                            <span className="min-w-0 flex-1 truncate">{item.label}</span>
                            {badgeLabel !== null ? (
                              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${isActive ? "bg-white text-[#0063fe] ring-1 ring-[#d9e7ff] dark:bg-slate-900 dark:ring-slate-700" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
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

        <div className={`border-t border-slate-200 py-2 dark:border-slate-800 ${isCollapsed ? "flex justify-center px-1.5" : "px-2"}`}>
          {isCollapsed ? (
            <LogoutButton compact />
          ) : (
            <div className="[&>div]:w-full [&_button]:w-full">
              <LogoutButton />
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
