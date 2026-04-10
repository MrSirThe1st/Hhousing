"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Tenant } from "@hhousing/domain";
import type { TenantListItem, TenantManagementPanelProps } from "./tenant-management.types";
import ActionMenu from "./action-menu";

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

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#010a19]">Locataires</h1>
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

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm max-w-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-[#010a19]">Ajouter un locataire</h2>
            <p className="mt-1 text-sm text-gray-500">
              Ouvrez un écran dédié pour ajouter un locataire avec ses informations de profil et sa photo.
            </p>
          </div>
          <Link
            href="/dashboard/tenants/add"
            className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white hover:bg-[#0050d0]"
          >
            Ajouter un locataire
          </Link>
        </div>
      </div>

      {tenants.length > 0 ? (
        <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#010a19]">Affichage et filtres</h2>
            <p className="mt-1 text-sm text-gray-500">
              {withLeaseCount} avec bail, {withoutLeaseCount} sans bail.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
              <button
                type="button"
                onClick={() => setDisplayMode("table")}
                className={`rounded-lg px-4 py-2 text-sm font-medium ${
                  displayMode === "table" ? "bg-[#0063fe] text-white" : "text-gray-600 hover:bg-white"
                }`}
              >
                Tableau
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode("cards")}
                className={`rounded-lg px-4 py-2 text-sm font-medium ${
                  displayMode === "cards" ? "bg-[#0063fe] text-white" : "text-gray-600 hover:bg-white"
                }`}
              >
                Cartes
              </button>
            </div>

            <label className="text-sm font-medium text-gray-700">
              <span className="mb-1.5 block">Statut du bail</span>
              <select
                value={leaseFilter}
                onChange={(event) => setLeaseFilter(event.target.value as "all" | "with-lease" | "without-lease")}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
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
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 text-sm text-gray-400">
          Aucun locataire pour l&apos;instant.
        </div>
      ) : filteredTenants.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 text-sm text-gray-400">
          Aucun locataire ne correspond au filtre sélectionné.
        </div>
      ) : displayMode === "table" ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Nom</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-left">E-mail</th>
                <th className="px-4 py-3 text-left">Téléphone</th>
                <th className="px-4 py-3 text-left">Ajouté le</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTenants.map((item) => {
                const { tenant } = item;

                return (
                  <tr key={tenant.id} className="hover:bg-gray-50">
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
                          <div>{tenant.fullName}</div>
                          {tenant.dateOfBirth ? (
                            <div className="text-xs font-normal text-gray-500">Né le {tenant.dateOfBirth}</div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <LeaseStatusBadge hasLease={item.hasLease} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">{tenant.email ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{tenant.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(tenant.createdAtIso).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3">
                      <ActionMenu
                        items={[
                          { label: "Voir la fiche", href: `/dashboard/tenants/${tenant.id}` }
                        ]}
                      />
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
              <div key={tenant.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
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
                      <p className="text-sm text-gray-500">
                        Ajouté le {new Date(tenant.createdAtIso).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>
                  <LeaseStatusBadge hasLease={item.hasLease} />
                </div>

                <div className="mt-4 space-y-2 text-sm text-gray-600">
                  <p><span className="font-medium text-[#010a19]">E-mail:</span> {tenant.email ?? "—"}</p>
                  <p><span className="font-medium text-[#010a19]">Téléphone:</span> {tenant.phone ?? "—"}</p>
                  <p><span className="font-medium text-[#010a19]">Date de naissance:</span> {tenant.dateOfBirth ?? "—"}</p>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <ActionMenu
                    items={[
                      { label: "Voir la fiche", href: `/dashboard/tenants/${tenant.id}` }
                    ]}
                    align="left"
                  />
                </div>
              </div>
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
        hasLease ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
      }`}
    >
      {hasLease ? "Avec bail" : "Sans bail"}
    </span>
  );
}