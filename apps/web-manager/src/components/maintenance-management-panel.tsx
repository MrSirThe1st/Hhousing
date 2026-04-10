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
  const openCount = useMemo(() => requests.filter((request) => request.status === "open").length, [requests]);
  const inProgressCount = useMemo(() => requests.filter((request) => request.status === "in_progress").length, [requests]);
  const resolvedCount = useMemo(() => requests.filter((request) => request.status === "resolved").length, [requests]);
  const urgentCount = useMemo(() => requests.filter((request) => request.priority === "urgent").length, [requests]);

  const filteredRequests = useMemo(() => {
    if (statusFilter === "all") return requests;
    return requests.filter(r => r.status === statusFilter);
  }, [requests, statusFilter]);

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#010a19]">Demandes de maintenance</h1>
          <p className="mt-2 text-sm text-slate-500">Les demandes sont créées par les locataires via l&apos;app mobile et pilotées ici.</p>
        </div>
        <p className="text-sm text-slate-500">{urgentCount} demande(s) urgente(s) à traiter en priorité.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Demandes</p>
          <p className="mt-1 text-3xl font-semibold text-[#010a19]">{requests.length}</p>
          <p className="mt-2 text-xs text-slate-500">Ensemble du flux maintenance.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Ouvertes</p>
          <p className="mt-1 text-3xl font-semibold text-[#010a19]">{openCount}</p>
          <p className="mt-2 text-xs text-slate-500">Tickets à qualifier ou démarrer.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">En cours</p>
          <p className="mt-1 text-3xl font-semibold text-[#010a19]">{inProgressCount}</p>
          <p className="mt-2 text-xs text-slate-500">Interventions actuellement suivies.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Résolues</p>
          <p className="mt-1 text-3xl font-semibold text-[#010a19]">{resolvedCount}</p>
          <p className="mt-2 text-xs text-slate-500">Historique des demandes clôturées.</p>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
          <h2 className="text-lg font-semibold text-[#010a19]">Aucune demande pour l&apos;instant</h2>
          <p className="mt-2 text-sm text-slate-500">Les prochains signalements locataires apparaîtront ici avec leur niveau de priorité.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter("all")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                statusFilter === "all"
                  ? "bg-white text-[#0063fe] shadow-sm ring-1 ring-slate-200"
                  : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              Tous ({requests.length})
            </button>
            <button
              onClick={() => setStatusFilter("open")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                statusFilter === "open"
                  ? "bg-white text-[#0063fe] shadow-sm ring-1 ring-blue-200"
                  : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              Ouverts ({openCount})
            </button>
            <button
              onClick={() => setStatusFilter("in_progress")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                statusFilter === "in_progress"
                  ? "bg-white text-amber-700 shadow-sm ring-1 ring-amber-200"
                  : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              Assignées ({inProgressCount})
            </button>
            <button
              onClick={() => setStatusFilter("resolved")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                statusFilter === "resolved"
                  ? "bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-200"
                  : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              Résolus ({resolvedCount})
            </button>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Titre</th>
                <th className="px-4 py-3 text-left">Priorité</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-left">Créé le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRequests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-medium text-[#010a19]">
                    <Link href={`/dashboard/maintenance/${req.id}`} className="transition hover:text-[#0063fe] hover:underline">
                      {req.title}
                    </Link>
                  </td>
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
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(req.createdAtIso).toLocaleDateString("fr-FR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredRequests.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              Aucune demande dans cette catégorie.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
