import React, { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Sidebar from "../../components/sidebar";
import BottomNavigation from "../../components/bottom-navigation";
import FloatingActionButton from "../../components/floating-action-button";
import SaasBillingOverdueBanner from "../../components/saas-billing-overdue-banner";
import { getDashboardRequestContext } from "../../lib/dashboard-request-context";
import { getServerAuthSession } from "../../lib/session";
import { getServerOperatorContext } from "../../lib/operator-context";
import { isIndividualExperience } from "../../lib/platform-experience";
import { getSidebarBadgeCounts } from "../../lib/sidebar-badge-counts";
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
  const session = await getServerAuthSession();

  if (session === null) {
    redirect("/login");
  }

  if (session.role === "tenant") {
    redirect("/account-type");
  }

  if (session.role === "platform_admin") {
    redirect("/admin");
  }

  if (!session.organizationId) {
    redirect("/account-type");
  }

  const context = await getDashboardRequestContext();
  if (context === null) {
    redirect("/account-type");
  }

  const { access: sidebarAccess, organization } = context;

  const [operatorContext, badgeCounts, overdueInvoice] = await Promise.all([
    getServerOperatorContext(context.session),
    getSidebarBadgeCounts(context.session),
    (async () => {
      try {
        const billingRepo = createPlatformBillingRepositoryFromEnv(process.env);
        return await billingRepo.getOpenOverdueInvoiceForOrganization(context.session.organizationId);
      } catch {
        return null;
      }
    })()
  ]);

  const isIndividual = isIndividualExperience(operatorContext.experience);
  const bannerInvoice = sidebarAccess.billing ? overdueInvoice : null;

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50 overflow-hidden w-full max-w-full dark:bg-[#0a1120]">
      <Sidebar
        currentRoleLabel={getRoleLabel(context.session.role === "landlord" || context.session.role === "property_manager" ? context.session.role : "property_manager")}
        access={sidebarAccess}
        isIndividualExperience={isIndividual}
        initialOrganization={organization}
        initialBadgeCounts={badgeCounts}
      />
      <main className="flex-1 overflow-y-auto pb-32 md:pb-0 min-w-0 max-w-full overflow-x-hidden">
        <div className="sticky top-0 z-10 flex h-14 items-center border-b border-slate-200 bg-white px-4 md:px-6 dark:border-slate-800 dark:bg-[#0d1526]">
          <div className="flex w-full items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#010a19] dark:text-white">Mon espace</p>
              <p className="text-xs md:text-sm text-gray-500 line-clamp-1 md:line-clamp-none dark:text-slate-400">
                {isIndividual
                  ? "Gérez vos biens, locataires et paiements depuis un espace simplifié."
                  : "Tous vos biens au même endroit. Filtrez par propriétaire pour voir un client à la fois."}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden md:block">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
        {bannerInvoice ? <SaasBillingOverdueBanner invoice={bannerInvoice} /> : null}
        {children}
      </main>
      <Suspense fallback={null}>
        <BottomNavigation
          access={sidebarAccess}
          currentRoleLabel={getRoleLabel(context.session.role === "landlord" || context.session.role === "property_manager" ? context.session.role : "property_manager")}
          isIndividualExperience={isIndividual}
        />
      </Suspense>
      <FloatingActionButton access={sidebarAccess} />
    </div>
  );
}
