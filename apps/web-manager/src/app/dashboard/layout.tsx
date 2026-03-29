import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Sidebar from "../../components/sidebar";
import { getServerAuthSession } from "../../lib/session";

export const metadata: Metadata = {
  title: "hhousing — Tableau de bord",
};

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
    // This could show a custom error page or redirect
    // For now, we'll redirect to a tenant-not-allowed page
    // In the future, this could be a mobile app deep link
    redirect("/tenant-mobile-only");
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
