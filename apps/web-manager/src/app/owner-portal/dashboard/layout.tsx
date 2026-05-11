import { redirect } from "next/navigation";
import OwnerPortalSignOutButton from "@/components/owner-portal/sign-out-button";
import OwnerPortalSidebar from "@/components/owner-portal/sidebar";
import { getOwnerPortalSession } from "@/lib/owner-portal/server-session";

export default async function OwnerPortalDashboardLayout({
  children
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const session = await getOwnerPortalSession();
  if (session === null) {
    redirect("/owner-portal/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl space-y-6 lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-6 lg:space-y-0">
        <OwnerPortalSidebar />

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#010a19]">Portefeuille consultatif</h1>
                <p className="mt-1 text-sm text-slate-600">Accès owner</p>
              </div>
              <OwnerPortalSignOutButton />
            </div>
          </div>
          <div className="p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
