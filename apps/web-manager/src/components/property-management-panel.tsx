"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PropertyWithUnitsView } from "@hhousing/api-contracts";
import type { PropertyManagementPanelProps } from "./property-management.types";
import ActionMenu from "./action-menu";

type PropertyStatusFilter = "all" | "active" | "archived";
type PropertyTypeFilter = "all" | "single_unit" | "multi_unit";
type UnitStatusFilter = "all" | "occupied" | "vacant" | "inactive";
type PropertyOwnerFilterOption = {
  id: string;
  label: string;
};

function formatPropertyTypeLabel(value: "single_unit" | "multi_unit"): string {
  return value === "single_unit" ? "Simple" : "Multi-unités";
}

function formatPropertyStatusLabel(value: string): string {
  return value === "active" ? "Actif" : "Archivé";
}

function formatPropertyStatusClassName(value: string): string {
  return value === "active"
    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
    : "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
}

function formatUnitStatusLabel(value: string): string {
  if (value === "occupied") {
    return "Occupée";
  }

  if (value === "vacant") {
    return "Vacante";
  }

  return "Inactive";
}

function formatUnitStatusClassName(value: string): string {
  if (value === "occupied") {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
  }

  if (value === "vacant") {
    return "bg-blue-50 text-[#0063fe] ring-1 ring-blue-100";
  }

  return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
}

function formatCurrencyAmount(amount: number, currencyCode: string): string {
  return `${amount.toLocaleString("fr-FR")} ${currencyCode}`;
}

function PlusIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function PropertyManagementPanel({
  items,
}: PropertyManagementPanelProps): React.ReactElement {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"properties" | "units">("properties");
  const [propertySearchTerm, setPropertySearchTerm] = useState("");
  const [propertyStatusFilter, setPropertyStatusFilter] = useState<PropertyStatusFilter>("all");
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<PropertyTypeFilter>("all");
  const [propertyOwnerFilter, setPropertyOwnerFilter] = useState<string>("all");
  const [unitSearchTerm, setUnitSearchTerm] = useState("");
  const [unitPropertyFilter, setUnitPropertyFilter] = useState<string>("all");
  const [unitStatusFilter, setUnitStatusFilter] = useState<UnitStatusFilter>("all");

  const propertyOptions: PropertyWithUnitsView[] = useMemo(() => items, [items]);
  const propertyOwnerOptions = useMemo<PropertyOwnerFilterOption[]>(() => {
    const optionsMap = new Map<string, PropertyOwnerFilterOption>();

    items.forEach(({ property }) => {
      if (!optionsMap.has(property.ownerId)) {
        optionsMap.set(property.ownerId, {
          id: property.ownerId,
          label: property.ownerName
        });
      }
    });

    return Array.from(optionsMap.values()).sort((left, right) => left.label.localeCompare(right.label, "fr"));
  }, [items]);
  const summary = useMemo(() => {
    const totalProperties = items.length;
    const totalUnits = items.reduce((count, entry) => count + entry.units.length, 0);
    const occupiedUnits = items.reduce(
      (count, entry) => count + entry.units.filter((unit) => unit.status === "occupied").length,
      0
    );
    const occupancyRate = totalUnits === 0 ? 0 : Math.round((occupiedUnits / totalUnits) * 100);

    return { totalProperties, totalUnits, occupancyRate };
  }, [items]);
  const filteredProperties = useMemo(() => {
    const normalizedSearchTerm = propertySearchTerm.trim().toLowerCase();

    return items.filter(({ property, units }) => {
      const matchesSearch =
        normalizedSearchTerm.length === 0 ||
        property.name.toLowerCase().includes(normalizedSearchTerm) ||
        property.address.toLowerCase().includes(normalizedSearchTerm) ||
        property.city.toLowerCase().includes(normalizedSearchTerm) ||
        property.ownerName.toLowerCase().includes(normalizedSearchTerm) ||
        (property.clientName?.toLowerCase().includes(normalizedSearchTerm) ?? false);
      const matchesStatus = propertyStatusFilter === "all" || property.status === propertyStatusFilter;
      const matchesType = propertyTypeFilter === "all" || property.propertyType === propertyTypeFilter;
      const matchesOwner = propertyOwnerFilter === "all" || property.ownerId === propertyOwnerFilter;

      return matchesSearch && matchesStatus && matchesType && matchesOwner && (property.propertyType === "multi_unit" || units.length >= 0);
    });
  }, [items, propertyOwnerFilter, propertySearchTerm, propertyStatusFilter, propertyTypeFilter]);
  const unitRows = useMemo(
    () => items.flatMap(({ property, units }) => units.map((unit) => ({ property, unit }))),
    [items]
  );
  const filteredUnitRows = useMemo(
    () => {
      const normalizedSearchTerm = unitSearchTerm.trim().toLowerCase();

      return unitRows.filter(({ property, unit }) => {
        const matchesProperty = unitPropertyFilter === "all" || property.id === unitPropertyFilter;
        const matchesStatus = unitStatusFilter === "all" || unit.status === unitStatusFilter;
        const matchesSearch =
          normalizedSearchTerm.length === 0 ||
          unit.unitNumber.toLowerCase().includes(normalizedSearchTerm) ||
          property.name.toLowerCase().includes(normalizedSearchTerm) ||
          property.city.toLowerCase().includes(normalizedSearchTerm);

        return matchesProperty && matchesStatus && matchesSearch;
      });
    },
    [unitPropertyFilter, unitRows, unitSearchTerm, unitStatusFilter]
  );

  function handlePropertyRowNavigation(propertyId: string): void {
    router.push(`/dashboard/properties/${propertyId}`);
  }

  function handleUnitRowNavigation(unitId: string): void {
    router.push(`/dashboard/units/${unitId}`);
  }

  function isInteractiveTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    return target.closest("a, button, input, select, textarea, [role='menu']") !== null;
  }

  return (
    <div className="space-y-6 p-8">
   
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#010a19]">Portfolio</h1>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {summary.totalProperties} biens, {summary.totalUnits} unités, {summary.occupancyRate}% d’occupation.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard/properties/add"
              className="inline-flex items-center gap-2 rounded-lg bg-[#0063fe] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0052d4]"
            >
              <PlusIcon />
              Ajouter un bien
            </Link>
            <Link
              href="/dashboard/units/add"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <PlusIcon />
              Ajouter une unité
            </Link>
          </div>
        </div>
  

    
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setActiveTab("properties")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  activeTab === "properties"
                    ? "bg-white text-[#0063fe] shadow-sm ring-1 ring-slate-200"
                    : "text-slate-600 hover:text-[#010a19]"
                }`}
              >
                Biens
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("units")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  activeTab === "units"
                    ? "bg-white text-[#0063fe] shadow-sm ring-1 ring-slate-200"
                    : "text-slate-600 hover:text-[#010a19]"
                }`}
              >
                Unités
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6 p-6">
          {activeTab === "properties" ? (
            <>
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px_220px_220px_auto] xl:items-end">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#010a19]">Rechercher un bien</label>
                  <input
                    value={propertySearchTerm}
                    onChange={(event) => setPropertySearchTerm(event.target.value)}
                    placeholder="Nom, adresse, ville ou propriétaire"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#010a19]">Statut</label>
                  <select
                    value={propertyStatusFilter}
                    onChange={(event) => setPropertyStatusFilter(event.target.value as PropertyStatusFilter)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15"
                  >
                    <option value="all">Tous</option>
                    <option value="active">Actifs</option>
                    <option value="archived">Archivés</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#010a19]">Type</label>
                  <select
                    value={propertyTypeFilter}
                    onChange={(event) => setPropertyTypeFilter(event.target.value as PropertyTypeFilter)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15"
                  >
                    <option value="all">Tous</option>
                    <option value="single_unit">Simple</option>
                    <option value="multi_unit">Multi-unités</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#010a19]">Propriétaire</label>
                  <select
                    value={propertyOwnerFilter}
                    onChange={(event) => setPropertyOwnerFilter(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15"
                  >
                    <option value="all">Tous les propriétaires</option>
                    {propertyOwnerOptions.map((owner) => (
                      <option key={owner.id} value={owner.id}>
                        {owner.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPropertySearchTerm("");
                    setPropertyStatusFilter("all");
                    setPropertyTypeFilter("all");
                    setPropertyOwnerFilter("all");
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Réinitialiser
                </button>
              </div>

              {items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                  <h2 className="text-lg font-semibold text-[#010a19]">Aucun bien disponible</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Commencez par créer le premier bien de votre portefeuille pour structurer votre exploitation.
                  </p>
                  <Link
                    href="/dashboard/properties/add"
                    className="mt-5 inline-flex rounded-lg bg-[#0063fe] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0052d4]"
                  >
                    Ajouter un bien
                  </Link>
                </div>
              ) : filteredProperties.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
                  Aucun bien ne correspond aux filtres sélectionnés.
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                      <tr>
                        <th className="px-5 py-3 text-left">Bien</th>
                        <th className="px-5 py-3 text-left">Ville</th>
                        <th className="px-5 py-3 text-left">Type</th>
                        <th className="px-5 py-3 text-left">Occupation</th>
                        <th className="px-5 py-3 text-left">Statut</th>
                        <th className="px-5 py-3 text-right"><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredProperties.map(({ property, units }) => {
                        const occupiedUnits = units.filter((unit) => unit.status === "occupied").length;
                        const vacantUnits = units.filter((unit) => unit.status === "vacant").length;

                        return (
                          <tr
                            key={property.id}
                            className="cursor-pointer hover:bg-slate-50/80"
                            tabIndex={0}
                            onClick={(event) => {
                              if (isInteractiveTarget(event.target)) {
                                return;
                              }

                              handlePropertyRowNavigation(property.id);
                            }}
                            onKeyDown={(event) => {
                              if (isInteractiveTarget(event.target)) {
                                return;
                              }

                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                handlePropertyRowNavigation(property.id);
                              }
                            }}
                          >
                            <td className="px-5 py-4 align-top">
                              <Link href={`/dashboard/properties/${property.id}`} className="font-semibold text-[#10213d] transition hover:text-[#0063fe] hover:underline">
                                {property.name}
                              </Link>
                              <div className="mt-1 text-sm text-slate-500">{property.address}</div>
                            </td>
                            <td className="px-5 py-4 text-slate-600">{property.city}</td>
                            <td className="px-5 py-4 text-slate-600">{formatPropertyTypeLabel(property.propertyType)}</td>
                            <td className="px-5 py-4 text-slate-600">
                              {units.length === 0 ? (
                                <span>Aucune unité</span>
                              ) : (
                                <div>
                                  <div className="font-medium text-[#10213d]">{occupiedUnits}/{units.length} occupées</div>
                                  <div className="mt-1 text-xs text-slate-500">{vacantUnits} vacantes</div>
                                </div>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${formatPropertyStatusClassName(property.status)}`}>
                                {formatPropertyStatusLabel(property.status)}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right" onClick={(event) => event.stopPropagation()}>
                              <ActionMenu
                                items={[
                                  { label: "Modifier la propriété", href: `/dashboard/properties/${property.id}` },
                                  { label: "Ajouter une unité", href: "/dashboard/units/add" }
                                ]}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px_220px_auto] xl:items-end">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#010a19]">Rechercher une unité</label>
                  <input
                    value={unitSearchTerm}
                    onChange={(event) => setUnitSearchTerm(event.target.value)}
                    placeholder="Numéro, bien ou ville"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#010a19]">Bien</label>
                  <select
                    value={unitPropertyFilter}
                    onChange={(event) => setUnitPropertyFilter(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15"
                  >
                    <option value="all">Tous les biens</option>
                    {propertyOptions.map(({ property }) => (
                      <option key={property.id} value={property.id}>
                        {property.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#010a19]">Statut</label>
                  <select
                    value={unitStatusFilter}
                    onChange={(event) => setUnitStatusFilter(event.target.value as UnitStatusFilter)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15"
                  >
                    <option value="all">Tous</option>
                    <option value="occupied">Occupées</option>
                    <option value="vacant">Vacantes</option>
                    <option value="inactive">Inactives</option>
                  </select>
                </div>
 
              </div>

              {unitRows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                  <h2 className="text-lg font-semibold text-[#010a19]">Aucune unité disponible</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Ajoutez une première unité à un bien existant pour démarrer le suivi locatif opérationnel.
                  </p>
                  <Link
                    href="/dashboard/units/add"
                    className="mt-5 inline-flex rounded-lg bg-[#0063fe] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0052d4]"
                  >
                    Ajouter une unité
                  </Link>
                </div>
              ) : filteredUnitRows.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
                  Aucune unité ne correspond aux filtres sélectionnés.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                      <tr>
                        <th className="px-5 py-3 text-left">Unité</th>
                        <th className="px-5 py-3 text-left">Bien</th>
                        <th className="px-5 py-3 text-left">Ville</th>
                        <th className="px-5 py-3 text-left">Loyer</th>
                        <th className="px-5 py-3 text-left">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredUnitRows.map(({ property, unit }) => (
                        <tr
                          key={unit.id}
                          className="cursor-pointer hover:bg-slate-50/80"
                          tabIndex={0}
                          onClick={(event) => {
                            if (isInteractiveTarget(event.target)) {
                              return;
                            }

                            handleUnitRowNavigation(unit.id);
                          }}
                          onKeyDown={(event) => {
                            if (isInteractiveTarget(event.target)) {
                              return;
                            }

                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              handleUnitRowNavigation(unit.id);
                            }
                          }}
                        >
                          <td className="px-5 py-4">
                            <Link href={`/dashboard/units/${unit.id}`} className="font-semibold text-[#10213d] transition hover:text-[#0063fe] hover:underline">
                              {unit.unitNumber}
                            </Link>
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            <Link href={`/dashboard/properties/${property.id}`} className="font-medium text-[#10213d] hover:text-[#0063fe] hover:underline">
                              {property.name}
                            </Link>
                          </td>
                          <td className="px-5 py-4 text-slate-600">{property.city}</td>
                          <td className="px-5 py-4 text-slate-600">{formatCurrencyAmount(unit.monthlyRentAmount, unit.currencyCode)}</td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${formatUnitStatusClassName(unit.status)}`}>
                              {formatUnitStatusLabel(unit.status)}
                            </span>
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
     
    </div>
  );
}
