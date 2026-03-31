"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { MaintenanceRequest, MaintenanceStatus } from "@hhousing/domain";

const STATUS_LABELS: Record<MaintenanceStatus, string> = {
  open: "Ouvert",
  in_progress: "En cours",
  resolved: "Résolu",
  cancelled: "Annulé"
};

const STATUS_STYLES: Record<MaintenanceStatus, string> = {
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  resolved: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500"
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Faible",
  medium: "Moyen",
  high: "Élevé",
  urgent: "Urgent"
};

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-gray-100 text-gray-500",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700"
};

type MaintenanceManagementPanelProps = {
  requests: MaintenanceRequest[];
};

export default function MaintenanceManagementPanel({
  requests
}: MaintenanceManagementPanelProps): React.ReactElement {
  const [statusFilter, setStatusFilter] = useState<MaintenanceStatus | "all">("all");

  const filteredRequests = useMemo(() => {
    if (statusFilter === "all") return requests;
    return requests.filter(r => r.status === statusFilter);
  }, [requests, statusFilter]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#010a19]">Demandes de Maintenance</h1>
        <p className="text-sm text-gray-500">Les demandes sont créées par les locataires via l'app mobile</p>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 text-sm text-gray-400">
          Aucune demande pour l&apos;instant.
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
              Tous ({requests.length})
            </button>
            <button
              onClick={() => setStatusFilter("open")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                statusFilter === "open"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              Ouverts ({requests.filter(r => r.status === "open").length})
            </button>
            <button
              onClick={() => setStatusFilter("in_progress")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                statusFilter === "in_progress"
                  ? "bg-yellow-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              Assignées ({requests.filter(r => r.status === "in_progress").length})
            </button>
            <button
              onClick={() => setStatusFilter("resolved")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                statusFilter === "resolved"
                  ? "bg-green-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              Résolus ({requests.filter(r => r.status === "resolved").length})
            </button>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Titre</th>
                <th className="px-4 py-3 text-left">Priorité</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-left">Créé le</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRequests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-[#010a19]">{req.title}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PRIORITY_STYLES[req.priority] ?? "bg-gray-100 text-gray-500"}`}>
                      {PRIORITY_LABELS[req.priority] ?? req.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[req.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {STATUS_LABELS[req.status] ?? req.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(req.createdAtIso).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/maintenance/${req.id}`}
                      className="text-[#0063fe] hover:underline text-sm font-medium"
                    >
                      Voir détails
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredRequests.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              Aucune demande dans cette catégorie.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
