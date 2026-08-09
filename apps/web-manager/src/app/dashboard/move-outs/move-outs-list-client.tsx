"use client";

import { useState } from "react";
import Link from "next/link";
import type { MoveOutListItem } from "@hhousing/data-access";

type FilterTab = "all" | "active" | "done" | "cancelled";

interface MoveOutsListClientProps {
  initialMoveOuts: MoveOutListItem[];
}

function statusLabel(status: MoveOutListItem["status"]): React.ReactElement {
  if (status === "planned") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
        Fin prévue
      </span>
    );
  }
  if (status === "completed" || status === "closed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
        Terminée
      </span>
    );
  }
  if (status === "cancelled") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
        Annulée
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-600">
      {status}
    </span>
  );
}

function formatDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  });
}

function formatMoney(amount: number | null, currencyCode: string | null): string {
  if (amount === null) return "—";
  return `${amount.toLocaleString("fr-FR")} ${currencyCode ?? ""}`.trim();
}

export default function MoveOutsListClient({ initialMoveOuts }: MoveOutsListClientProps): React.ReactElement {
  const [tab, setTab] = useState<FilterTab>("all");

  const filtered = initialMoveOuts.filter((mo) => {
    if (tab === "active") return mo.status === "planned" || mo.status === "draft" || mo.status === "confirmed";
    if (tab === "done") return mo.status === "completed" || mo.status === "closed";
    if (tab === "cancelled") return mo.status === "cancelled";
    return true;
  });

  const tabs: Array<{ id: FilterTab; label: string }> = [
    { id: "all", label: "Tous" },
    { id: "active", label: "En cours" },
    { id: "done", label: "Terminées" },
    { id: "cancelled", label: "Annulées" }
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
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-gray-500">
            Aucune fin de location dans cette vue. Démarrez depuis un bail actif.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Locataire</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Bien</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Départ</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">À rembourser</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((mo) => (
                <tr key={mo.moveOutId} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-[#010a19]">{mo.tenantFullName}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {[mo.propertyName, mo.unitLabel].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(mo.departureEffectiveDate)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatMoney(mo.depositRefundAmount, mo.currencyCode)}</td>
                  <td className="px-4 py-3">{statusLabel(mo.status)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/dashboard/leases/${mo.leaseId}`} className="text-sm font-medium text-[#0063fe] hover:underline">
                      Voir le bail
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
