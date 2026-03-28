import type { Metadata } from "next";
import Sidebar from "../../components/sidebar";

export const metadata: Metadata = {
  title: "hhousing — Tableau de bord",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
