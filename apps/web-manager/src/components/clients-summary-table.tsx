"use client";

import type { Owner } from "@hhousing/domain";
import ResponsiveTable from "./responsive-table";

export interface ClientSummary {
  owner: Owner;
  propertyCount: number;
  unitCount: number;
  occupiedUnitCount: number;
  activeTenantCount: number;
  overduePaymentCount: number;
}

function formatOwnerLocation(owner: Owner): string | null {
  const parts = [owner.city, owner.state, owner.country].filter(
    (value): value is string => Boolean(value)
  );
  return parts.length > 0 ? parts.join(", ") : null;
}

export default function ClientsSummaryTable({
  summaries
}: {
  summaries: ClientSummary[];
}): React.ReactElement {
  return (
    <ResponsiveTable<ClientSummary>
      keyExtractor={(summary) => summary.owner.id}
      data={summaries}
      onRowClick={(summary) => {
        window.location.href = `/dashboard/clients/${summary.owner.id}`;
      }}
      columns={[
        {
          header: "Propriétaire",
          render: (summary) => (
            <div className="flex items-start gap-3">
              {summary.owner.profilePictureUrl ? (
                <img
                  src={summary.owner.profilePictureUrl}
                  alt={summary.owner.name}
                  className="h-12 w-12 rounded-2xl object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0063fe]/10 text-sm font-semibold text-[#0063fe]">
                  {summary.owner.name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div>
                <span className="font-semibold text-[#10213d] hover:text-[#0063fe] hover:underline">
                  {summary.owner.name}
                </span>
                <div className="mt-1 text-sm text-slate-500">{summary.owner.fullName}</div>
                {summary.owner.phoneNumber ? (
                  <div className="mt-2 text-xs text-slate-500">{summary.owner.phoneNumber}</div>
                ) : null}
              </div>
            </div>
          )
        },
        {
          header: "Type",
          render: (summary) => (
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                summary.owner.isCompany
                  ? "bg-blue-50 text-[#0063fe] ring-1 ring-blue-100"
                  : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
              }`}
            >
              {summary.owner.isCompany ? "Société" : "Particulier"}
            </span>
          )
        },
        {
          header: "Localisation",
          render: (summary) => (
            <span>{formatOwnerLocation(summary.owner) ?? "Non renseignée"}</span>
          )
        },
        {
          header: "Biens",
          render: (summary) => {
            const ownerOccupancyRate =
              summary.unitCount > 0
                ? Math.round((summary.occupiedUnitCount / summary.unitCount) * 100)
                : 0;
            return (
              <div>
                <div className="font-medium text-[#10213d]">
                  {summary.propertyCount} bien(s)
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {summary.unitCount} unité(s), {ownerOccupancyRate}% occupées
                </div>
              </div>
            );
          }
        },
        {
          header: "Opérations",
          render: (summary) => (
            <div>
              <div className="font-medium text-[#10213d]">
                {summary.activeTenantCount} locataire(s) actif(s)
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {summary.overduePaymentCount} retard(s)
              </div>
            </div>
          )
        },
        {
          header: "Création",
          render: (summary) => (
            <span>{new Date(summary.owner.createdAtIso).toLocaleDateString("fr-FR")}</span>
          )
        }
      ]}
      renderMobileCard={(summary) => {
        const ownerOccupancyRate =
          summary.unitCount > 0
            ? Math.round((summary.occupiedUnitCount / summary.unitCount) * 100)
            : 0;
        return (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                {summary.owner.profilePictureUrl ? (
                  <img
                    src={summary.owner.profilePictureUrl}
                    alt={summary.owner.name}
                    className="h-12 w-12 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0063fe]/10 text-sm font-semibold text-[#0063fe]">
                    {summary.owner.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-[#010a19]">{summary.owner.name}</h3>
                  <p className="text-xs text-slate-500">{summary.owner.fullName}</p>
                  <p className="text-xs text-slate-500">
                    {formatOwnerLocation(summary.owner) ?? "Non renseignée"}
                  </p>
                </div>
              </div>
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  summary.owner.isCompany
                    ? "bg-blue-50 text-[#0063fe] ring-1 ring-blue-100"
                    : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
                }`}
              >
                {summary.owner.isCompany ? "Société" : "Particulier"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 border-t border-slate-100 pt-3">
              <div>
                <p className="font-semibold text-slate-800">Biens gérés</p>
                <p className="mt-0.5">
                  {summary.propertyCount} biens ({summary.unitCount} unités)
                </p>
                <p className="mt-0.5 text-slate-400">Taux occupation: {ownerOccupancyRate}%</p>
              </div>
              <div>
                <p className="font-semibold text-slate-800">Opérations</p>
                <p className="mt-0.5">{summary.activeTenantCount} locataires actifs</p>
                <p className="mt-0.5 text-slate-400">
                  {summary.overduePaymentCount} retards
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-400 border-t border-slate-100 pt-2 flex justify-between">
              <span>
                Créé le {new Date(summary.owner.createdAtIso).toLocaleDateString("fr-FR")}
              </span>
              <span className="font-semibold text-[#0063fe]">Ouvrir le dossier →</span>
            </div>
          </div>
        );
      }}
    />
  );
}
