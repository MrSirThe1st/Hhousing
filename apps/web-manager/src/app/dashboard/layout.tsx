import React from "react";
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
    redirect("/account-type");
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
