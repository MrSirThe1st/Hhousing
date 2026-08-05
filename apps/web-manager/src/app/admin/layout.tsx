import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AdminSidebar from "../../components/admin-sidebar";
import ThemeToggle from "../../components/theme-toggle";
import { getServerAuthSession } from "../../lib/session";

export const metadata: Metadata = {
  title: "hhousing — Admin plateforme"
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
    <div className="flex min-h-screen flex-col bg-gray-50 md:flex-row dark:bg-[#0a1120]">
      <AdminSidebar />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:px-6 dark:border-slate-800 dark:bg-[#0d1526]">
          <div>
            <p className="text-sm font-medium text-[#010a19] dark:text-white">Console d&apos;administration</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Utilisateurs, organisations et activité système
            </p>
          </div>
          <ThemeToggle />
        </div>
        <div className="px-4 py-6 md:px-6">{children}</div>
      </main>
    </div>
  );
}
