import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Sidebar from "../../components/sidebar";
import OperatorScopeSwitcher from "../../components/operator-scope-switcher";
import { getOperatorScopeLabel, getServerOperatorContext } from "../../lib/operator-context";
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

  const operatorContext = await getServerOperatorContext(session);
  const showClients = operatorContext.availableScopes.includes("managed");

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        currentScopeLabel={getOperatorScopeLabel(operatorContext.currentScope)}
        showClients={showClients}
      />
      <main className="flex flex-1 flex-col overflow-y-auto">
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50/95 px-8 py-4 backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[#010a19]">Espace operateur</p>
              <p className="text-sm text-gray-500">
                {operatorContext.canSwitch
                  ? "Basculer entre votre parc et les biens geres pour vos clients."
                  : `Affichage verrouille sur ${getOperatorScopeLabel(operatorContext.currentScope).toLowerCase()}.`}
              </p>
            </div>
            <OperatorScopeSwitcher context={operatorContext} />
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
