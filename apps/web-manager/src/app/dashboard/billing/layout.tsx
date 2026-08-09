import { Suspense } from "react";
import DashboardBillingSubnav from "../../../components/dashboard-billing-subnav";
import { requireDashboardSectionAccess } from "../../../lib/dashboard-access";

export default async function DashboardBillingLayout({
  children
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  await requireDashboardSectionAccess("billing");

  return (
    <div className="space-y-6 p-4 sm:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#010a19] dark:text-white">
          Abonnement Haraka
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Solde, factures et paiements de votre abonnement
        </p>
      </div>

      <Suspense fallback={<div className="h-10 border-b border-slate-200 dark:border-slate-800" />}>
        <DashboardBillingSubnav />
      </Suspense>

      {children}
    </div>
  );
}
