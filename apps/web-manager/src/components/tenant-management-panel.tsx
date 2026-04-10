"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { TenantListItem, TenantManagementPanelProps } from "./tenant-management.types";

export default function TenantManagementPanel({
  organizationId,
  tenants
}: TenantManagementPanelProps): React.ReactElement {
  const [displayMode, setDisplayMode] = useState<"table" | "cards">("table");
  const [leaseFilter, setLeaseFilter] = useState<"all" | "with-lease" | "without-lease">("all");
  const [message] = useState<string | null>(null);
  const [error] = useState<string | null>(null);

  const filteredTenants = useMemo(() => {
    return tenants.filter((item) => {
      if (leaseFilter === "with-lease") {
        return item.hasLease;
      }

      if (leaseFilter === "without-lease") {
        return !item.hasLease;
      }

      return true;
    });
  }, [leaseFilter, tenants]);

  const withLeaseCount = useMemo(() => tenants.filter((item) => item.hasLease).length, [tenants]);
  const withoutLeaseCount = tenants.length - withLeaseCount;
  const contactableCount = useMemo(
    () => tenants.filter((item) => Boolean(item.tenant.email || item.tenant.phone)).length,
    [tenants]
  );

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#010a19]">Locataires</h1>
          <p className="mt-2 text-sm text-slate-500">
            {tenants.length} locataire(s), {withLeaseCount} avec bail actif ou en attente, {withoutLeaseCount} sans bail.
          </p>
        </div>
        <Link
          href="/dashboard/tenants/add"
          className="inline-flex items-center rounded-lg bg-[#0063fe] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0052d4]"
        >
          Ajouter un locataire
        </Link>
      </div>

      {message ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Locataires</p>
          <p className="mt-1 text-3xl font-semibold text-[#010a19]">{tenants.length}</p>
          <p className="mt-2 text-xs text-slate-500">Base complète du portefeuille locatif.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Avec bail</p>
          <p className="mt-1 text-3xl font-semibold text-[#010a19]">{withLeaseCount}</p>
          <p className="mt-2 text-xs text-slate-500">Profils actuellement engagés sur une unité.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Sans bail</p>
          <p className="mt-1 text-3xl font-semibold text-[#010a19]">{withoutLeaseCount}</p>
          <p className="mt-2 text-xs text-slate-500">Profils disponibles pour une affectation.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Contactables</p>
          <p className="mt-1 text-3xl font-semibold text-[#010a19]">{contactableCount}</p>
          <p className="mt-2 text-xs text-slate-500">Locataires avec email ou téléphone renseigné.</p>
        </div>
      </div>

      {tenants.length > 0 ? (
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#010a19]">Affichage et filtres</h2>
            <p className="mt-1 text-sm text-slate-500">
              {withLeaseCount} avec bail, {withoutLeaseCount} sans bail.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setDisplayMode("table")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  displayMode === "table"
                    ? "bg-white text-[#0063fe] shadow-sm ring-1 ring-slate-200"
                    : "text-slate-600 hover:text-[#010a19]"
                }`}
              >
                Tableau
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode("cards")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  displayMode === "cards"
                    ? "bg-white text-[#0063fe] shadow-sm ring-1 ring-slate-200"
                    : "text-slate-600 hover:text-[#010a19]"
                }`}
              >
                Cartes
              </button>
            </div>

            <label className="text-sm font-medium text-[#010a19]">
              <span className="mb-1.5 block">Statut du bail</span>
              <select
                value={leaseFilter}
                onChange={(event) => setLeaseFilter(event.target.value as "all" | "with-lease" | "without-lease")}
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15"
              >
                <option value="all">Tous</option>
                <option value="with-lease">Avec bail</option>
                <option value="without-lease">Sans bail</option>
              </select>
            </label>
          </div>
        </div>
      ) : null}

      {tenants.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
          <h2 className="text-lg font-semibold text-[#010a19]">Aucun locataire pour l&apos;instant</h2>
          <p className="mt-2 text-sm text-slate-500">Ajoutez un premier locataire pour préparer les affectations et les baux.</p>
        </div>
      ) : filteredTenants.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
          Aucun locataire ne correspond au filtre sélectionné.
        </div>
      ) : displayMode === "table" ? (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Nom</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-left">E-mail</th>
                <th className="px-4 py-3 text-left">Téléphone</th>
                <th className="px-4 py-3 text-left">Ajouté le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredTenants.map((item) => {
                const { tenant } = item;

                return (
                  <tr key={tenant.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-medium text-[#010a19]">
                      <div className="flex items-center gap-3">
                        {tenant.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={tenant.photoUrl} alt={tenant.fullName} className="h-9 w-9 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-xs text-gray-500">
                            {tenant.fullName.substring(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <Link href={`/dashboard/tenants/${tenant.id}`} className="transition hover:text-[#0063fe] hover:underline">
                            {tenant.fullName}
                          </Link>
                          {tenant.dateOfBirth ? (
                            <div className="text-xs font-normal text-slate-500">Né le {tenant.dateOfBirth}</div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <LeaseStatusBadge hasLease={item.hasLease} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{tenant.email ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{tenant.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(tenant.createdAtIso).toLocaleDateString("fr-FR")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredTenants.map((item) => {
            const { tenant } = item;

            return (
              <Link key={tenant.id} href={`/dashboard/tenants/${tenant.id}`} className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-[#0063fe] hover:bg-[#0063fe]/3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {tenant.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={tenant.photoUrl} alt={tenant.fullName} className="h-12 w-12 rounded-2xl object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-sm text-gray-500">
                        {tenant.fullName.substring(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-[#010a19]">{tenant.fullName}</h3>
                      <p className="text-sm text-slate-500">
                        Ajouté le {new Date(tenant.createdAtIso).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>
                  <LeaseStatusBadge hasLease={item.hasLease} />
                </div>

                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  <p><span className="font-medium text-[#010a19]">E-mail:</span> {tenant.email ?? "—"}</p>
                  <p><span className="font-medium text-[#010a19]">Téléphone:</span> {tenant.phone ?? "—"}</p>
                  <p><span className="font-medium text-[#010a19]">Date de naissance:</span> {tenant.dateOfBirth ?? "—"}</p>
                </div>

                <div className="mt-5 text-sm font-semibold text-[#0063fe]">
                  Ouvrir le dossier
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LeaseStatusBadge({ hasLease }: { hasLease: boolean }): React.ReactElement {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
        hasLease ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100" : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
      }`}
    >
      {hasLease ? "Avec bail" : "Sans bail"}
    </span>
  );
}