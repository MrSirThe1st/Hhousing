"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { LeaseStatus } from "@hhousing/domain";
import type { LeaseManagementPanelProps } from "./tenant-management.types";
import ActionMenu from "./action-menu";

const STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  ended: "Terminé",
  pending: "En attente"
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  ended: "bg-gray-100 text-gray-500",
  pending: "bg-yellow-100 text-yellow-700"
};

export default function LeaseManagementPanel({
  leases
}: LeaseManagementPanelProps): React.ReactElement {
  const [statusFilter, setStatusFilter] = useState<LeaseStatus | "all">("all");

  const filteredLeases = useMemo(() => {
    if (statusFilter === "all") return leases;
    return leases.filter(lease => lease.status === statusFilter);
  }, [leases, statusFilter]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#010a19]">Baux</h1>
        <Link href="/dashboard/leases/move-in" className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white hover:bg-[#0050d0]">
          Move in
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-500">Total</p>
          <p className="mt-2 text-2xl font-semibold text-[#010a19]">{leases.length}</p>
          <p className="mt-1 text-sm text-gray-500">Tous statuts confondus</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-500">Actifs</p>
          <p className="mt-2 text-2xl font-semibold text-green-700">
            {leases.filter((lease) => lease.status === "active").length}
          </p>
          <p className="mt-1 text-sm text-gray-500">Baux en cours</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-500">En attente</p>
          <p className="mt-2 text-2xl font-semibold text-yellow-700">
            {leases.filter((lease) => lease.status === "pending").length}
          </p>
          <p className="mt-1 text-sm text-gray-500">Démarrage ou validation</p>
        </div>
      </div>

      {leases.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 text-sm text-gray-400">
          Aucun bail pour l&apos;instant.
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 flex gap-2">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                statusFilter === "all"
                  ? "bg-[#0063fe] text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              Tous ({leases.length})
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                statusFilter === "active"
                  ? "bg-green-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              Actifs ({leases.filter(l => l.status === "active").length})
            </button>
            <button
              onClick={() => setStatusFilter("ended")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                statusFilter === "ended"
                  ? "bg-gray-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              Terminés ({leases.filter(l => l.status === "ended").length})
            </button>
            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                statusFilter === "pending"
                  ? "bg-yellow-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              En attente ({leases.filter(l => l.status === "pending").length})
            </button>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Locataire</th>
                <th className="px-4 py-3 text-left">Début</th>
                <th className="px-4 py-3 text-left">Fin</th>
                <th className="px-4 py-3 text-left">Loyer</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLeases.map((lease) => (
                <tr key={lease.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-[#010a19]">{lease.tenantFullName}</td>
                  <td className="px-4 py-3 text-gray-600">{lease.startDate}</td>
                  <td className="px-4 py-3 text-gray-600">{lease.endDate ?? "Ouvert"}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {lease.monthlyRentAmount.toLocaleString("fr-FR")} {lease.currencyCode}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[lease.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {STATUS_LABELS[lease.status] ?? lease.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <ActionMenu
                      items={[
                        { label: "Voir la fiche", href: `/dashboard/leases/${lease.id}` }
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredLeases.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              Aucun bail dans cette catégorie.
            </div>
          )}
        </div>
      )}
    </div>
  );
}