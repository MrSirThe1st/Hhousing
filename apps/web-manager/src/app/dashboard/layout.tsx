import React, { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Sidebar from "../../components/sidebar";
import SidebarToggleButton from "../../components/sidebar-toggle-button";
import BottomNavigation from "../../components/bottom-navigation";
import FloatingActionButton from "../../components/floating-action-button";
import SaasBillingOverdueBanner from "../../components/saas-billing-overdue-banner";
import { getServerAuthSession } from "../../lib/session";
import { resolveDashboardAccess } from "../../lib/dashboard-access";
import { getServerOperatorContext } from "../../lib/operator-context";
import { isIndividualExperience } from "../../lib/platform-experience";
import ThemeToggle from "../../components/theme-toggle";
import { createPlatformBillingRepositoryFromEnv } from "@hhousing/data-access";

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

  // Platform admins use /admin, not the operator dashboard
  if (session.role === "platform_admin") {
    redirect("/admin");
  }

  if (!session.organizationId) {
    redirect("/account-type");
  }

  const sidebarAccess = await resolveDashboardAccess(session);
  const operatorContext = await getServerOperatorContext(session);
  const isIndividual = isIndividualExperience(operatorContext.experience);

  let overdueInvoice = null;
  if (sidebarAccess.billing) {
    try {
      const billingRepo = createPlatformBillingRepositoryFromEnv(process.env);
      overdueInvoice = await billingRepo.getOpenOverdueInvoiceForOrganization(session.organizationId);
    } catch {
      overdueInvoice = null;
    }
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50 overflow-hidden w-full max-w-full dark:bg-[#0a1120]">
      <Sidebar
        currentRoleLabel={getRoleLabel(session.role)}
        access={sidebarAccess}
        isIndividualExperience={isIndividual}
      />
      <main className="flex-1 overflow-y-auto pb-32 md:pb-0 min-w-0 max-w-full overflow-x-hidden">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3 md:px-6 md:py-4 dark:border-slate-800 dark:bg-[#0d1526]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="hidden md:block">
                <SidebarToggleButton />
              </div>
              <div>
                <p className="text-sm font-medium text-[#010a19] dark:text-white">Mon espace</p>
                <p className="text-xs md:text-sm text-gray-500 line-clamp-1 md:line-clamp-none dark:text-slate-400">
                  {isIndividual
                    ? "Gérez vos biens, locataires et paiements depuis un espace simplifié."
                    : "Tous vos biens au même endroit. Filtrez par propriétaire pour voir un client à la fois."}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden md:block">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
        {overdueInvoice ? <SaasBillingOverdueBanner invoice={overdueInvoice} /> : null}
        {children}
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
