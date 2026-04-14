import { redirect } from "next/navigation";
import OwnerPortalSignOutButton from "@/components/owner-portal/sign-out-button";
import OwnerPortalSidebar from "@/components/owner-portal/sidebar";
import { getOwnerPortalSession } from "@/lib/owner-portal/server-session";
import { loadOwnerPortfolio } from "@/lib/owner-portal/owner-portfolio";

export default async function OwnerPortalDashboardLayout({
  children
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const session = await getOwnerPortalSession();
  if (session === null) {
    redirect("/owner-portal/login");
  }

  const portfolio = await loadOwnerPortfolio(session);
  const ownerNames = portfolio.owners.map((owner) => owner.fullName || owner.name).join(" • ");

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#edf2f7_100%)] px-4 py-4 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-4 lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-4 lg:space-y-0">
        <OwnerPortalSidebar />

        <div className="rounded-3xl border border-slate-200 bg-white shadow-[0_24px_70px_-50px_rgba(15,23,42,0.35)]">
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Owner portal</p>
                <h1 className="mt-2 text-2xl font-semibold text-slate-950">Portefeuille consultatif</h1>
                <p className="mt-2 text-sm text-slate-600">{ownerNames || "Acces owner"}</p>
              </div>
              <OwnerPortalSignOutButton />
            </div>
          </div>
          <div className="px-6 py-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
