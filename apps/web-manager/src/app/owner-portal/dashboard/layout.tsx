import { redirect } from "next/navigation";
import OwnerPortalAccountMenu from "@/components/owner-portal/account-menu";
import OwnerPortalSidebar, { OwnerPortalMobileNav } from "@/components/owner-portal/sidebar";
import { getOwnerPortalSession } from "@/lib/owner-portal/server-session";

export default async function OwnerPortalDashboardLayout({
  children
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const session = await getOwnerPortalSession();
  if (session === null) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen w-full max-w-full flex-col overflow-hidden bg-gray-50 md:flex-row dark:bg-[#0a1120]">
      <OwnerPortalSidebar />

      <main className="min-w-0 max-w-full flex-1 overflow-x-hidden overflow-y-auto pb-24 md:pb-0">
        <div className="sticky top-0 z-10 flex h-14 items-center border-b border-slate-200 bg-white px-4 md:px-6 dark:border-slate-800 dark:bg-[#0d1526]">
          <div className="flex w-full items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#010a19] dark:text-white">Espace propriétaire</p>
              <p className="line-clamp-1 text-xs text-gray-500 md:text-sm dark:text-slate-400">
                Consultez vos biens, encaissements et indicateurs en lecture seule.
              </p>
            </div>
            <OwnerPortalAccountMenu />
          </div>
        </div>

        <div className="p-6 md:p-8">{children}</div>
      </main>

      <OwnerPortalMobileNav />
    </div>
  );
}
