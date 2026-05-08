"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Organization } from "@hhousing/domain";
import { useAuth } from "../contexts/auth-context";

const SIDEBAR_STORAGE_KEY = "hhousing.sidebar.collapsed";
const SIDEBAR_SET_COLLAPSED_EVENT = "hhousing.sidebar.setCollapsed";

type IconName =
  | "dashboard"
  | "portfolio"
  | "clients"
  | "listings"
  | "tenants"
  | "leases"
  | "move-outs"
  | "revenues"
  | "expenses"
  | "reports"
  | "payments"
  | "maintenance"
  | "documents"
  | "messages"
  | "team"
  | "audit";

export type SidebarAccess = {
  dashboard: boolean;
  operations: boolean;
  finances: boolean;
  services: boolean;
  organization: boolean;
  audit: boolean;
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

function SidebarIcon({ name, active }: { name: IconName; active: boolean }): React.ReactElement {
  const strokeClassName = active ? "stroke-current" : "stroke-slate-600 group-hover:stroke-[#010a19]";

  switch (name) {
    case "dashboard":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" className={strokeClassName} strokeWidth="1.8" />
          <rect x="13.5" y="3.5" width="7" height="5" rx="1.5" className={strokeClassName} strokeWidth="1.8" />
          <rect x="13.5" y="11.5" width="7" height="9" rx="1.5" className={strokeClassName} strokeWidth="1.8" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" className={strokeClassName} strokeWidth="1.8" />
        </svg>
      );
    case "portfolio":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
          <path d="M4 20.5V9.5L12 4l8 5.5v11" className={strokeClassName} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M9 20.5v-5h6v5" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "clients":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
          <circle cx="9" cy="8" r="3" className={strokeClassName} strokeWidth="1.8" />
          <path d="M4.5 18.5c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M16 10.5c1.9 0 3.5 1.6 3.5 3.5" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M15 5.5c1.4.2 2.5 1.4 2.5 2.9" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "listings":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
          <path d="M5 18.5V5.5h14v13" className={strokeClassName} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M8 9.5h8M8 13h5" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M12 18.5l2.4-2.4a1.8 1.8 0 0 0 0-2.5 1.8 1.8 0 0 0-2.5 0l-.4.4-.4-.4a1.8 1.8 0 0 0-2.5 2.5L12 18.5Z" className={strokeClassName} strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );
    case "tenants":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
          <circle cx="12" cy="8" r="3.5" className={strokeClassName} strokeWidth="1.8" />
          <path d="M5.5 19c0-3.2 2.9-5.5 6.5-5.5s6.5 2.3 6.5 5.5" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "leases":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
          <path d="M7 3.5h7l4 4v13H7z" className={strokeClassName} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M14 3.5v4h4" className={strokeClassName} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M9.5 12h5M9.5 15.5h5" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "move-outs":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
          <path d="M14 20.5H7V3.5h10v8" className={strokeClassName} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M9.5 9h5M9.5 12.5h3" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M13.5 17.5h7M17.5 14.5l3 3-3 3" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "revenues":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
          <path d="M4 18.5h16" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M6.5 15l4-4 3 2.5 4.5-5" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15.5 8.5H18v2.5" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "expenses":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
          <path d="M4 18.5h16" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M6.5 9 10.5 13l3-2.5L18 15" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15.5 15H18v-2.5" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "reports":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
          <path d="M7 4.5h10v15H7z" className={strokeClassName} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M10 9h4M10 12.5h4M10 16h2" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "payments":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
          <rect x="4" y="6" width="16" height="12" rx="2" className={strokeClassName} strokeWidth="1.8" />
          <path d="M4 10h16" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M8 14.5h3" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "maintenance":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
          <path d="M14.5 6.5a3 3 0 0 1 3.9 3.9l-7.8 7.8-4.6 1 1-4.6 7.5-7.5Z" className={strokeClassName} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M13 8l3 3" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "documents":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
          <path d="M8 3.5h6l4 4v9.5A3.5 3.5 0 0 1 14.5 20.5H8.5A3.5 3.5 0 0 1 5 17V7a3.5 3.5 0 0 1 3-3.5Z" className={strokeClassName} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M14 3.5v4h4" className={strokeClassName} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M9 13.5h6" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "messages":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
          <path d="M5 7.5A2.5 2.5 0 0 1 7.5 5h9A2.5 2.5 0 0 1 19 7.5v6A2.5 2.5 0 0 1 16.5 16H11l-4 3v-3H7.5A2.5 2.5 0 0 1 5 13.5z" className={strokeClassName} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M8.5 9.5h7M8.5 12h4.5" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "team":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
          <circle cx="8.5" cy="9" r="2.5" className={strokeClassName} strokeWidth="1.8" />
          <circle cx="15.5" cy="8" r="2" className={strokeClassName} strokeWidth="1.8" />
          <path d="M4.5 18c0-2.2 1.9-4 4.2-4h.6c2.3 0 4.2 1.8 4.2 4" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M14.5 17c.2-1.6 1.5-2.8 3.1-2.8h.2c1 0 1.8.4 2.4 1.1" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "audit":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
          <path d="M6 4.5h12M6 9h12M6 13.5h6" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="16.5" cy="16.5" r="3.5" className={strokeClassName} strokeWidth="1.8" />
          <path d="M19 19l2 2" className={strokeClassName} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
  }
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

export default function Sidebar({ currentRoleLabel, access }: SidebarProps): React.ReactElement {
  const pathname = usePathname();
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [badgeCounts, setBadgeCounts] = useState<SidebarBadgeCounts>(createEmptyBadgeCounts);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const baseNavSections: NavSection[] = [
    {
      title: "Tableau de bord",
      items: [{ href: "/dashboard", label: "Vue d'ensemble", icon: "dashboard" }]
    },
    {
      title: "Opérations locatives",
      items: [
        { href: "/dashboard/properties", label: "Portfolio", icon: "portfolio" },
        { href: "/dashboard/clients", label: "Propriétaires", icon: "clients" },
        { href: "/dashboard/listings", label: "Listings", icon: "listings", badgeCount: badgeCounts.listings },
        { href: "/dashboard/tenants", label: "Locataires", icon: "tenants" },
        { href: "/dashboard/leases", label: "Baux", icon: "leases" },
        { href: "/dashboard/move-outs", label: "Départs", icon: "move-outs" }
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
        { href: "/dashboard/maintenance", label: "Maintenance", icon: "maintenance", badgeCount: badgeCounts.maintenance },
        { href: "/dashboard/documents", label: "Documents", icon: "documents" }
      ]
    },
    {
      title: "Organisation",
      items: [
        { href: "/dashboard/team", label: "Équipe", icon: "team" },
        { href: "/dashboard/audit", label: "Audit", icon: "audit" }
      ]
    }
  ];

  const navSections: NavSection[] = baseNavSections.map((section) => {
    if (section.title === "Tableau de bord" && !access.dashboard) {
      return { ...section, items: [] };
    }

    if (section.title === "Opérations locatives" && !access.operations) {
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

        if (item.href === "/dashboard/audit") {
          return access.audit;
        }

        return true;
      });

      return { ...section, items };
    }

    return section;
  }).filter((section) => section.items.length > 0);

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

  const userDisplayName = (() => {
    if (!user) return "Profile";
    const meta = user.user_metadata;
    if (meta && typeof meta === "object") {
      const fullName = "full_name" in meta ? meta.full_name : undefined;
      if (typeof fullName === "string" && fullName.trim()) return fullName.trim();
      const name = "name" in meta ? meta.name : undefined;
      if (typeof name === "string" && name.trim()) return name.trim();
    }
    return user.email?.split("@")[0] ?? "Profile";
  })();

  const userAvatarUrl = (() => {
    if (!user?.user_metadata || typeof user.user_metadata !== "object") return null;
    const avatar = "avatar_url" in user.user_metadata ? user.user_metadata.avatar_url : undefined;
    return typeof avatar === "string" && avatar.trim() ? avatar : null;
  })();

  const userInitials = userDisplayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p: string) => p[0]?.toUpperCase() ?? "")
    .join("") || "OP";

  return (
    <aside
      className={`flex h-full shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white text-[#010a19] transition-[width] duration-300 ${shellWidthClassName}`}
    >
      {/* Top: organisation block */}
      <div className="border-b border-slate-200 px-3 py-3">
        {access.manageOrganization ? (
          <Link
            href="/dashboard/organization"
            className={`flex min-w-0 flex-1 items-center rounded-lg transition hover:bg-slate-50 ${isCollapsed ? "justify-center px-1 py-1" : "gap-3 px-2 py-1.5"}`}
            aria-label="Organisation"
            title={isCollapsed ? "Organisation" : undefined}
          >
            {organization?.logoUrl ? (
              <img src={organization.logoUrl} alt={organization.name} className="h-9 w-9 shrink-0 rounded-md object-contain bg-white p-1 ring-1 ring-slate-200" />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-sm font-semibold uppercase text-[#10213d] ring-1 ring-slate-200">
                {getOrganizationInitials(organization?.name)}
              </div>
            )}
            {!isCollapsed ? (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#10213d]">{organization?.name ?? "Organisation"}</p>
                <p className="truncate text-xs text-slate-500">{organizationSubtitle}</p>
              </div>
            ) : null}
          </Link>
        ) : (
          <div className={`flex min-w-0 flex-1 items-center ${isCollapsed ? "justify-center px-1 py-1" : "gap-3 px-2 py-1.5"}`}>
            {organization?.logoUrl ? (
              <img src={organization.logoUrl} alt={organization.name} className="h-9 w-9 shrink-0 rounded-md object-contain bg-white p-1 ring-1 ring-slate-200" />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-sm font-semibold uppercase text-[#10213d] ring-1 ring-slate-200">
                {getOrganizationInitials(organization?.name)}
              </div>
            )}
            {!isCollapsed ? (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#10213d]">{organization?.name ?? "Organisation"}</p>
                <p className="truncate text-xs text-slate-500">{organizationSubtitle}</p>
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
                <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">
                  {section.title}
                </p>
              ) : (
                <div className="mx-auto mb-3 h-px w-8 bg-slate-200" />
              )}
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
                          ? "bg-[#f2f6fb] text-[#0f2748]"
                          : "text-[#243b5a] hover:bg-slate-50 hover:text-[#010a19]"
                      }`}
                      aria-label={isCollapsed ? item.label : undefined}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <span className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition ${isActive ? "bg-white text-[#0063fe] ring-1 ring-[#d9e7ff]" : "text-slate-500"}`}>
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
                            <span className={`rounded-full px-2 py-1 text-[11px] font-semibold leading-none ${isActive ? "bg-white text-[#0063fe] ring-1 ring-[#d9e7ff]" : "bg-slate-100 text-slate-600"}`}>
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

      {/* Bottom: user profile */}
      <div className="border-t border-slate-200 px-3 py-3">
        <Link
          href="/dashboard/profile"
          className={`flex items-center rounded-lg transition hover:bg-slate-50 ${isCollapsed ? "justify-center px-1 py-2" : "gap-3 px-2 py-2"}`}
          aria-label="My profile"
          title={isCollapsed ? userDisplayName : undefined}
        >
          {userAvatarUrl ? (
            <img src={userAvatarUrl} alt={userDisplayName} className="h-8 w-8 shrink-0 rounded-full border border-slate-200 object-cover" />
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0063fe] text-xs font-semibold uppercase text-white">
              {userInitials}
            </span>
          )}
          {!isCollapsed ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[#10213d]">{userDisplayName}</p>
              <p className="truncate text-xs text-slate-500">{currentRoleLabel}</p>
            </div>
          ) : null}
        </Link>
      </div>
    </aside>
  );
}
