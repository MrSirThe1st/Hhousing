import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Sidebar from "../../components/sidebar";
import { getServerAuthSession } from "../../lib/session";
import { resolveDashboardAccess } from "../../lib/dashboard-access";

export const metadata: Metadata = {
  title: "hhousing — Tableau de bord",
};

function getRoleLabel(role: "landlord" | "property_manager" | "platform_admin"): string {
  if (role === "landlord") {
    return "Propriétaire";
  }

  if (role === "property_manager") {
    return "Gestionnaire";
  }

  return "Administrateur plateforme";
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  // Get auth session to verify operator access
  const session = await getServerAuthSession();

  // Not authenticated → redirect to login
  if (session === null) {
    redirect("/login");
  }

  // Tenant role → not permitted in web-manager
  if (session.role === "tenant") {
    redirect("/account-type");
  }

  const sidebarAccess = await resolveDashboardAccess(session);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar currentRoleLabel={getRoleLabel(session.role)} access={sidebarAccess} />
      <main className="flex flex-1 flex-col overflow-y-auto">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[#010a19]">Espace opérateur</p>
              <p className="text-sm text-gray-500">
                Portefeuille unifié par propriétaire. Utilisez les filtres par propriétaire pour segmenter les données.
              </p>
            </div>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
