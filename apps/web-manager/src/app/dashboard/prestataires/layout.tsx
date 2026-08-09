import { Suspense } from "react";
import PrestatairesSubnav from "../../../components/prestataires-subnav";
import ReadOnlyBanner from "../../../components/read-only-banner";
import { requireDashboardSectionAccess } from "../../../lib/dashboard-access";

export default async function PrestatairesLayout({
  children
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const { access } = await requireDashboardSectionAccess("services");

  return (
    <div className="space-y-6 p-4 sm:p-8">
      {!access.servicesWritable ? <ReadOnlyBanner /> : null}

      <div>
        <h1 className="text-2xl font-semibold text-[#010a19] dark:text-white">Artisans et services</h1>
        <p className="mt-1 text-sm text-slate-500">
          Affectez des contacts par bien, explorez le catalogue, gérez vos artisans de confiance
        </p>
      </div>

      <Suspense fallback={<div className="h-10 border-b border-slate-200 dark:border-slate-800" />}>
        <PrestatairesSubnav />
      </Suspense>

      {children}
    </div>
  );
}
