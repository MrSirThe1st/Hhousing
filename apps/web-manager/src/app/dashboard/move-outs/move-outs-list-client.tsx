"use client";

import { useState } from "react";
import Link from "next/link";
import type { MoveOutListItem } from "@hhousing/data-access";

type FilterTab = "all" | "active" | "closed";

interface MoveOutsListClientProps {
  initialMoveOuts: MoveOutListItem[];
}

function statusLabel(status: MoveOutListItem["status"]): React.ReactElement {
  if (status === "draft") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-600">
        <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
        Brouillon
      </span>
    );
  }
  if (status === "confirmed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Confirmé
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
      Clôturé
    </span>
  );
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function formatRelative(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "hier";
  if (days < 30) return `il y a ${days} j`;
  return formatDate(isoDate);
}

export default function MoveOutsListClient({ initialMoveOuts }: MoveOutsListClientProps): React.ReactElement {
  const [tab, setTab] = useState<FilterTab>("all");

  const filtered = initialMoveOuts.filter((mo) => {
    if (tab === "active") return mo.status === "draft" || mo.status === "confirmed";
    if (tab === "closed") return mo.status === "closed";
    return true;
  });

  const tabs: Array<{ id: FilterTab; label: string }> = [
    { id: "all", label: "Tous" },
    { id: "active", label: "En cours" },
    { id: "closed", label: "Clôturés" }
  ];

  return (
    <div>
      <div className="mb-4 flex gap-1 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? "border-b-2 border-[#0063fe] text-[#0063fe]"
                : "text-gray-500 hover:text-[#010a19]"
            }`}
          >
            {t.label}
            <span className="ml-2 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
              {initialMoveOuts.filter((mo) => {
                if (t.id === "active") return mo.status === "draft" || mo.status === "confirmed";
                if (t.id === "closed") return mo.status === "closed";
                return true;
              }).length}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-gray-500">
            {tab === "active"
              ? "Aucun départ en cours. Initiez un départ depuis un bail actif."
              : tab === "closed"
              ? "Aucun départ clôturé."
              : "Aucun dossier de départ."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Locataire</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Bien</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Date de sortie</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Statut</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Modifié</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((mo) => (
                <tr key={mo.moveOutId} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-[#010a19]">{mo.tenantFullName}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {mo.propertyName ?? "—"}
                    {mo.unitLabel ? <span className="ml-1 text-gray-400">· {mo.unitLabel}</span> : null}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(mo.moveOutDate)}</td>
                  <td className="px-4 py-3">{statusLabel(mo.status)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatRelative(mo.updatedAtIso)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/leases/${mo.leaseId}/move-out`}
                      className="text-xs font-semibold text-[#0063fe] hover:underline"
                    >
                      {mo.status === "closed" ? "Voir" : "Reprendre"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
