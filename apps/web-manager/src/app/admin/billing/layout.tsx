import { Suspense } from "react";
import AdminBillingSubnav from "../../../components/admin-billing-subnav";

export default function AdminBillingLayout({
  children
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#010a19] dark:text-white">
          Abonnement Haraka
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Encaissements, organisations et configuration tarifaire
        </p>
      </div>

      <Suspense fallback={<div className="h-10 border-b border-slate-200 dark:border-slate-800" />}>
        <AdminBillingSubnav />
      </Suspense>

      {children}
    </div>
  );
}
