"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PropertyWithUnitsView } from "@hhousing/api-contracts";
import type { PropertyManagementPanelProps } from "./property-management.types";

export default function PropertyManagementPanel({
  organizationId,
  currentScope,
  currentScopeLabel,
  items,
}: PropertyManagementPanelProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState<"properties" | "units">("properties");
  const [unitPropertyFilter, setUnitPropertyFilter] = useState<string>("all");

  const propertyOptions: PropertyWithUnitsView[] = useMemo(() => items, [items]);
  const unitCreateOptions = useMemo(
    () => items.filter(({ property, units }) => property.propertyType === "multi_unit" || units.length === 0),
    [items]
  );
  const unitRows = useMemo(
    () => items.flatMap(({ property, units }) => units.map((unit) => ({ property, unit }))),
    [items]
  );
  const filteredUnitRows = useMemo(
    () => unitRows.filter(({ property }) => unitPropertyFilter === "all" || property.id === unitPropertyFilter),
    [unitPropertyFilter, unitRows]
  );

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#010a19]">Portfolio</h1>
          <p className="mt-1 text-sm text-gray-500">Affichage courant: {currentScopeLabel}</p>
        </div>
      </div>

      <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab("properties")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "properties"
              ? "bg-[#0063fe] text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          Biens
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("units")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "units"
              ? "bg-[#0063fe] text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          Unités
        </button>
      </div>

      {activeTab === "properties" ? (
        <>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:max-w-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-[#010a19]">Ajouter un bien</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Créez un nouveau bien dans {currentScopeLabel.toLowerCase()} depuis un écran dédié.
                </p>
              </div>
              <Link
                href="/dashboard/properties/add"
                className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white hover:bg-[#0050d0]"
              >
                Ajouter un bien
              </Link>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 text-sm text-gray-400">
              Aucun bien dans {currentScopeLabel.toLowerCase()} pour l&apos;instant.
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Nom</th>
                    <th className="px-4 py-3 text-left">Contexte</th>
                    <th className="px-4 py-3 text-left">Adresse</th>
                    <th className="px-4 py-3 text-left">Ville</th>
                    <th className="px-4 py-3 text-left">Unités</th>
                    <th className="px-4 py-3 text-left">Statut</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map(({ property, units }) => (
                    <tr key={property.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-[#010a19]">
                        <div>{property.name}</div>
                        {property.clientName && property.clientId ? (
                          <div className="mt-1 text-xs font-normal text-gray-500">
                            Client: {" "}
                            <Link href={`/dashboard/clients/${property.clientId}`} className="text-[#0063fe] hover:underline">
                              {property.clientName}
                            </Link>
                          </div>
                        ) : property.clientName ? (
                          <div className="mt-1 text-xs font-normal text-gray-500">Client: {property.clientName}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                          {property.managementContext === "owned" ? "Mon parc" : "Parc gere"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{property.address}</td>
                      <td className="px-4 py-3 text-gray-600">{property.city}</td>
                      <td className="px-4 py-3 text-gray-600">{units.length}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            property.status === "active"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {property.status === "active" ? "Actif" : "Archivé"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/properties/${property.id}`}
                          className="text-[#0063fe] hover:underline text-sm font-medium"
                        >
                          Voir détails
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:max-w-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-[#010a19]">Ajouter une ou plusieurs unités</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Ouvrez un écran dédié pour compléter un bien existant avec le même niveau de détail que la création initiale.
                </p>
                {unitCreateOptions.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-500">
                    Aucun bien éligible. Les biens de type simple ne peuvent pas recevoir d'unité supplémentaire.
                  </p>
                ) : null}
              </div>
              <Link
                href="/dashboard/units/add"
                className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white hover:bg-[#0050d0]"
              >
                Ajouter une unité
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:max-w-sm">
            <label className="block text-sm font-medium text-[#010a19] mb-2">Filtrer par bien</label>
            <select
              value={unitPropertyFilter}
              onChange={(event) => setUnitPropertyFilter(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="all">Tous les biens</option>
              {propertyOptions.map(({ property }) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </div>

          {unitRows.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 text-sm text-gray-400">
              Aucune unité dans {currentScopeLabel.toLowerCase()} pour l&apos;instant.
            </div>
          ) : filteredUnitRows.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 text-sm text-gray-400">
              Aucune unité ne correspond au bien sélectionné.
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Unité</th>
                    <th className="px-4 py-3 text-left">Bien</th>
                    <th className="px-4 py-3 text-left">Loyer</th>
                    <th className="px-4 py-3 text-left">Devise</th>
                    <th className="px-4 py-3 text-left">Statut</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUnitRows.map(({ property, unit }) => (
                    <tr key={unit.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-[#010a19]">{unit.unitNumber}</td>
                      <td className="px-4 py-3 text-gray-600">
                        <Link href={`/dashboard/properties/${property.id}`} className="text-[#0063fe] hover:underline">
                          {property.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{unit.monthlyRentAmount.toLocaleString("fr-FR")}</td>
                      <td className="px-4 py-3 text-gray-600">{unit.currencyCode}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            unit.status === "occupied"
                              ? "bg-green-100 text-green-700"
                              : unit.status === "vacant"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {unit.status === "occupied" ? "Occupée" : unit.status === "vacant" ? "Vacante" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/units/${unit.id}`} className="text-[#0063fe] hover:underline text-sm font-medium">
                          Voir détails
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
