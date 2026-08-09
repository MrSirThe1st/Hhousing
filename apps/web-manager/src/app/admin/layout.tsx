import React, { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AdminBottomNavigation from "../../components/admin-bottom-navigation";
import AdminSidebar from "../../components/admin-sidebar";
import ThemeToggle from "../../components/theme-toggle";
import { getServerAuthSession } from "../../lib/session";

export const metadata: Metadata = {
  title: "Haraka Property — Admin plateforme"
};

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const session = await getServerAuthSession();

  if (session === null) {
    redirect("/login");
  }

  if (session.role !== "platform_admin") {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50 overflow-hidden w-full max-w-full dark:bg-[#0a1120]">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto pb-32 md:pb-0 min-w-0 max-w-full overflow-x-hidden">
        <div className="sticky top-0 z-10 flex h-14 items-center border-b border-slate-200 bg-white px-4 md:px-6 dark:border-slate-800 dark:bg-[#0d1526]">
          <div className="flex w-full items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#010a19] dark:text-white">Admin plateforme</p>
              <p className="text-xs md:text-sm text-gray-500 line-clamp-1 md:line-clamp-none dark:text-slate-400">
                Utilisateurs, organisations et activité système
              </p>
            </div>
            <div className="hidden md:block shrink-0">
              <ThemeToggle />
            </div>
          </div>
        </div>
        <div className="px-4 py-6 md:px-6">{children}</div>
      </main>
      <Suspense fallback={null}>
        <AdminBottomNavigation />
      </Suspense>
    </div>
  );
}
