"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PropertyWithUnitsView } from "@hhousing/api-contracts";
import { postWithAuth } from "../lib/api-client";
import type {
  PropertyFormState,
  PropertyManagementPanelProps,
  UnitFormState,
} from "./property-management.types";

const INITIAL_PROPERTY_FORM: PropertyFormState = {
  name: "",
  address: "",
  city: "",
  countryCode: "CD",
};

const INITIAL_UNIT_FORM: UnitFormState = {
  propertyId: "",
  unitNumber: "",
  monthlyRentAmount: "",
  currencyCode: "CDF",
};

export default function PropertyManagementPanel({
  organizationId,
  items,
}: PropertyManagementPanelProps): React.ReactElement {
  const router = useRouter();
  const [propertyForm, setPropertyForm] = useState<PropertyFormState>(INITIAL_PROPERTY_FORM);
  const [unitForm, setUnitForm] = useState<UnitFormState>({
    ...INITIAL_UNIT_FORM,
    propertyId: items[0]?.property.id ?? "",
  });
  const [propertyBusy, setPropertyBusy] = useState(false);
  const [unitBusy, setUnitBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const propertyOptions: PropertyWithUnitsView[] = useMemo(() => items, [items]);

  async function handleCreateProperty(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setPropertyBusy(true);
    setMessage(null);
    setError(null);

    const payload = {
      organizationId,
      name: propertyForm.name.trim(),
      address: propertyForm.address.trim(),
      city: propertyForm.city.trim(),
      countryCode: propertyForm.countryCode.trim().toUpperCase(),
    };

    const result = await postWithAuth("/api/properties", payload);

    if (!result.success) {
      setError(result.error);
      setPropertyBusy(false);
      return;
    }

    setPropertyForm(INITIAL_PROPERTY_FORM);
    setMessage("Propriété créée avec succès.");
    setPropertyBusy(false);
    router.refresh();
  }

  async function handleCreateUnit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setUnitBusy(true);
    setMessage(null);
    setError(null);

    const amount = Number(unitForm.monthlyRentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Le loyer mensuel doit être un nombre positif.");
      setUnitBusy(false);
      return;
    }

    const payload = {
      organizationId,
      propertyId: unitForm.propertyId,
      unitNumber: unitForm.unitNumber.trim(),
      monthlyRentAmount: amount,
      currencyCode: unitForm.currencyCode.trim().toUpperCase(),
    };

    const result = await postWithAuth("/api/units", payload);

    if (!result.success) {
      setError(result.error);
      setUnitBusy(false);
      return;
    }

    setUnitForm({
      ...INITIAL_UNIT_FORM,
      propertyId: unitForm.propertyId,
    });
    setMessage("Unité créée avec succès.");
    setUnitBusy(false);
    router.refresh();
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#010a19]">Propriétés</h1>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleCreateProperty} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
          <h2 className="text-base font-semibold text-[#010a19]">Ajouter une propriété</h2>
          <input
            value={propertyForm.name}
            onChange={(event) => setPropertyForm((prev) => ({ ...prev, name: event.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Nom"
            required
          />
          <input
            value={propertyForm.address}
            onChange={(event) => setPropertyForm((prev) => ({ ...prev, address: event.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Adresse"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              value={propertyForm.city}
              onChange={(event) => setPropertyForm((prev) => ({ ...prev, city: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Ville"
              required
            />
            <input
              value={propertyForm.countryCode}
              onChange={(event) => setPropertyForm((prev) => ({ ...prev, countryCode: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase"
              placeholder="Code pays"
              maxLength={2}
              required
            />
          </div>
          <button
            type="submit"
            disabled={propertyBusy}
            className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white hover:bg-[#0050d0] disabled:opacity-60"
          >
            {propertyBusy ? "Création..." : "Créer la propriété"}
          </button>
        </form>

        <form onSubmit={handleCreateUnit} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
          <h2 className="text-base font-semibold text-[#010a19]">Ajouter une unité</h2>
          <select
            value={unitForm.propertyId}
            onChange={(event) => setUnitForm((prev) => ({ ...prev, propertyId: event.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            required
          >
            <option value="">Sélectionner une propriété</option>
            {propertyOptions.map(({ property }) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
          <input
            value={unitForm.unitNumber}
            onChange={(event) => setUnitForm((prev) => ({ ...prev, unitNumber: event.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Numéro d'unité"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              value={unitForm.monthlyRentAmount}
              onChange={(event) => setUnitForm((prev) => ({ ...prev, monthlyRentAmount: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Loyer mensuel"
              inputMode="decimal"
              required
            />
            <input
              value={unitForm.currencyCode}
              onChange={(event) => setUnitForm((prev) => ({ ...prev, currencyCode: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase"
              placeholder="Devise"
              maxLength={3}
              required
            />
          </div>
          <button
            type="submit"
            disabled={unitBusy || propertyOptions.length === 0}
            className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white hover:bg-[#0050d0] disabled:opacity-60"
          >
            {unitBusy ? "Création..." : "Créer l'unité"}
          </button>
        </form>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 text-sm text-gray-400">
          Aucune propriété pour l&apos;instant.
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Nom</th>
                <th className="px-4 py-3 text-left">Adresse</th>
                <th className="px-4 py-3 text-left">Ville</th>
                <th className="px-4 py-3 text-left">Unités</th>
                <th className="px-4 py-3 text-left">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(({ property, units }) => (
                <tr key={property.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-[#010a19]">{property.name}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
