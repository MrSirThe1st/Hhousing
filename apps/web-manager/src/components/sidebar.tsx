"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../contexts/auth-context";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Vue d'ensemble", icon: "⊡" },
  { href: "/dashboard/properties", label: "Propriétés", icon: "🏢" },
  { href: "/dashboard/tenants", label: "Locataires", icon: "👤" },
  { href: "/dashboard/leases", label: "Baux", icon: "📄" },
  { href: "/dashboard/payments", label: "Paiements", icon: "💰" },
  { href: "/dashboard/maintenance", label: "Maintenance", icon: "🔧" },
];

export default function Sidebar(): React.ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();

  async function handleSignOut(): Promise<void> {
    await signOut();
    router.push("/login");
  }

  return (
    <aside className="flex h-full w-60 flex-col bg-[#010a19] text-white">
      {/* Brand */}
      <div className="flex items-center px-6 py-5 border-b border-white/10">
        <span className="text-xl font-semibold tracking-tight">hhousing</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
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
