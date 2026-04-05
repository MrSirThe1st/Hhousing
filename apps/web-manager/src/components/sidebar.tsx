"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../contexts/auth-context";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface SidebarProps {
  currentScopeLabel: string;
  showClients: boolean;
}

export default function Sidebar({ currentScopeLabel, showClients }: SidebarProps): React.ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const navSections: NavSection[] = [
    {
      title: "Tableau de bord",
      items: [{ href: "/dashboard", label: "Vue d'ensemble", icon: "⊡" }]
    },
    {
      title: "Opérations locatives",
      items: [
        { href: "/dashboard/properties", label: "Portfolio", icon: "🏢" },
        ...(showClients ? [{ href: "/dashboard/clients", label: "Clients", icon: "🏷️" }] : []),
        { href: "/dashboard/tenants", label: "Locataires", icon: "👤" },
        { href: "/dashboard/leases", label: "Baux", icon: "📄" }
      ]
    },
    {
      title: "Finances",
      items: [{ href: "/dashboard/payments", label: "Paiements", icon: "💰" }]
    },
    {
      title: "Services",
      items: [
        { href: "/dashboard/maintenance", label: "Maintenance", icon: "🔧" },
        { href: "/dashboard/documents", label: "Documents", icon: "📎" },
        { href: "/dashboard/messages", label: "Messages", icon: "💬" }
      ]
    },
    {
      title: "Organisation",
      items: [{ href: "/dashboard/team", label: "Équipe", icon: "👥" }]
    }
  ];

  async function handleSignOut(): Promise<void> {
    await signOut();
    router.push("/login");
  }

  return (
    <aside className="flex h-full w-60 flex-col bg-[#010a19] text-white">
      {/* Brand */}
      <div className="flex items-center px-6 py-5 border-b border-white/10">
        <div>
          <span className="text-xl font-semibold tracking-tight">hhousing</span>
          <p className="mt-1 text-xs text-white/40">{currentScopeLabel}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-5">
          {navSections.map((section) => (
            <div key={section.title}>
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive =
                    item.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-[#0063fe] text-white"
                          : "text-white/60 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span className="text-base leading-none">{item.icon}</span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* User / sign out */}
      <div className="border-t border-white/10 px-4 py-4">
        <p className="text-xs text-white/40 truncate mb-2">{user?.email ?? ""}</p>
        <button
          onClick={handleSignOut}
          className="w-full rounded-lg px-3 py-2 text-left text-sm text-white/60 hover:bg-white/10 hover:text-white transition-colors"
        >
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}
