import React, { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Sidebar from "../../components/sidebar";
import SidebarToggleButton from "../../components/sidebar-toggle-button";
import BottomNavigation from "../../components/bottom-navigation";
import FloatingActionButton from "../../components/floating-action-button";
import { getServerAuthSession } from "../../lib/session";
import { resolveDashboardAccess } from "../../lib/dashboard-access";
import { getServerOperatorContext } from "../../lib/operator-context";
import { isIndividualExperience } from "../../lib/platform-experience";
import DashboardTour from "../../components/dashboard-tour";

export const metadata: Metadata = {
  title: "hhousing — Tableau de bord",
};

function getRoleLabel(role: "landlord" | "property_manager" | "platform_admin"): string {
  if (role === "landlord") {
    return "Bailleur";
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
  const operatorContext = await getServerOperatorContext(session);
  const isIndividual = isIndividualExperience(operatorContext.experience);

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50 overflow-hidden w-full max-w-full">
      <Sidebar
        currentRoleLabel={getRoleLabel(session.role)}
        access={sidebarAccess}
        isIndividualExperience={isIndividual}
      />
      <main className="flex-1 overflow-y-auto pb-32 md:pb-0 min-w-0 max-w-full overflow-x-hidden">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="hidden md:block">
                <SidebarToggleButton />
              </div>
              <div>
                <p className="text-sm font-medium text-[#010a19]">Mon espace</p>
                <p className="text-xs md:text-sm text-gray-500 line-clamp-1 md:line-clamp-none">
                  {isIndividual
                    ? "Gérez vos biens, locataires et paiements depuis un espace simplifié."
                    : "Tous vos biens au même endroit. Filtrez par propriétaire pour voir un client à la fois."}
                </p>
              </div>
            </div>
            <button
              id="start-tour-button"
              className="flex items-center gap-2 shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 md:px-3 md:py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-[#0063fe] hover:border-[#0063fe]/30 focus:outline-none"
            >
              <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="hidden sm:inline">Visite guidée</span>
            </button>
          </div>
        </div>
        {children}
        <DashboardTour access={sidebarAccess} />
      </main>
      <Suspense fallback={null}>
        <BottomNavigation
          access={sidebarAccess}
          currentRoleLabel={getRoleLabel(session.role)}
          isIndividualExperience={isIndividual}
        />
      </Suspense>
      <FloatingActionButton access={sidebarAccess} />
    </div>
  );
}
