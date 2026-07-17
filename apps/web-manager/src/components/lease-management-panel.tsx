"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ResponsiveTable from "./responsive-table";
import type { LeaseStatus } from "@hhousing/domain";
import type { LeaseManagementPanelProps } from "./tenant-management.types";

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
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<LeaseStatus | "all">("all");
  const activeCount = useMemo(() => leases.filter((lease) => lease.status === "active").length, [leases]);
  const pendingCount = useMemo(() => leases.filter((lease) => lease.status === "pending").length, [leases]);
  const endedCount = useMemo(() => leases.filter((lease) => lease.status === "ended").length, [leases]);

  const filteredLeases = useMemo(() => {
    if (statusFilter === "all") return leases;
    return leases.filter(lease => lease.status === statusFilter);
  }, [leases, statusFilter]);

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#010a19]">Contrats</h1>
          <p className="mt-2 text-sm text-slate-500">
            {leases.length} contrat(s), {activeCount} actif(s), {pendingCount} en attente, {endedCount} terminé(s).
          </p>
        </div>
        <Link href="/dashboard/leases/move-in" className="inline-flex items-center rounded-lg bg-[#0063fe] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0052d4]">
          Move in
        </Link>
      </div>

      <div className="flex items-center gap-8 border-b border-slate-200 pb-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Total</p>
          <p className="text-xl font-semibold text-slate-900">{leases.length}</p>
        </div>

        <div className="h-6 w-px bg-slate-200" />

        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Actifs</p>
          <p className="text-xl font-semibold text-slate-900">{activeCount}</p>
        </div>

        <div className="h-6 w-px bg-slate-200" />

        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">En attente</p>
          <p className="text-xl font-semibold text-slate-900">{pendingCount}</p>
        </div>

        <div className="h-6 w-px bg-slate-200" />

        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Terminés</p>
          <p className="text-xl font-semibold text-slate-900">{endedCount}</p>
        </div>
      </div>

      {leases.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
          <h2 className="text-lg font-semibold text-[#010a19]">Aucun bail pour l&apos;instant</h2>
          <p className="mt-2 text-sm text-slate-500">Créez un premier move-in pour ouvrir le suivi contractuel.</p>
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
              Tous ({leases.length})
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                statusFilter === "active"
                  ? "bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-200"
                  : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              Actifs ({activeCount})
            </button>
            <button
              onClick={() => setStatusFilter("ended")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                statusFilter === "ended"
                  ? "bg-white text-slate-700 shadow-sm ring-1 ring-slate-200"
                  : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              Terminés ({endedCount})
            </button>
            <button
              onClick={() => setStatusFilter("pending")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                statusFilter === "pending"
                  ? "bg-white text-amber-700 shadow-sm ring-1 ring-amber-200"
                  : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              En attente ({pendingCount})
            </button>
          </div>

          <ResponsiveTable<any>
            keyExtractor={(lease) => lease.id}
            data={filteredLeases}
            onRowClick={(lease) => router.push(`/dashboard/leases/${lease.id}`)}
            columns={[
              {
                header: "Locataire",
                render: (lease) => (
                  <span className="font-semibold text-[#10213d] hover:text-[#0063fe] hover:underline">
                    {lease.tenantFullName}
                  </span>
                )
              },
              {
                header: "Début",
                render: (lease) => <span className="text-slate-600">{lease.startDate}</span>
              },
              {
                header: "Fin",
                render: (lease) => <span className="text-slate-600">{lease.endDate ?? "Ouvert"}</span>
              },
              {
                header: "Loyer",
                render: (lease) => (
                  <span className="text-slate-600">
                    {lease.monthlyRentAmount.toLocaleString("fr-FR")} {lease.currencyCode}
                  </span>
                )
              },
              {
                header: "Statut",
                render: (lease) => (
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[lease.status] ?? "bg-gray-100 text-gray-500"}`}>
                    {STATUS_LABELS[lease.status] ?? lease.status}
                  </span>
                )
              }
            ]}
            renderMobileCard={(lease) => (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-[#010a19]">{lease.tenantFullName}</h3>
                    <p className="text-xs text-slate-500">Dates: {lease.startDate} à {lease.endDate ?? "Ouvert"}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[lease.status] ?? "bg-gray-100 text-gray-500"}`}>
                    {STATUS_LABELS[lease.status] ?? lease.status}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <span>Loyer Mensuel</span>
                  <span className="font-bold text-[#010a19]">
                    {lease.monthlyRentAmount.toLocaleString("fr-FR")} {lease.currencyCode}
                  </span>
                </div>
              </div>
            )}
          />

          {filteredLeases.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              Aucun bail dans cette catégorie.
            </div>
          )}
        </div>
      )}
    </div>
  );
}