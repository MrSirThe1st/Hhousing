"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CreateUnitOutput, PropertyWithUnitsView } from "@hhousing/api-contracts";
import { postWithAuth } from "../lib/api-client";
import { AMENITY_OPTIONS, FEATURE_OPTIONS } from "./property-form-options";
import type { UnitFormState } from "./property-management.types";

const INITIAL_UNIT_FORM: UnitFormState = {
  propertyId: "",
  unitNumber: "",
  monthlyRentAmount: "",
  depositAmount: "",
  currencyCode: "CDF",
  bedroomCount: "",
  bathroomCount: "",
  sizeSqm: "",
  unitCount: "1",
  amenities: [],
  features: []
};

function parseOptionalNumber(value: string): number | null | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildUnitNumber(baseUnitNumber: string, index: number, unitCount: number): string {
  if (unitCount === 1) {
    return baseUnitNumber;
  }

  return `${baseUnitNumber} - Unite ${index + 1}`;
}

interface UnitCreateFormProps {
  organizationId: string;
  currentScopeLabel: string;
  items: PropertyWithUnitsView[];
}

export default function UnitCreateForm({
  organizationId,
  currentScopeLabel,
  items
}: UnitCreateFormProps): React.ReactElement {
  const router = useRouter();
  const unitCreateOptions = useMemo(
    () => items.filter(({ property, units }) => property.propertyType === "multi_unit" || units.length === 0),
    [items]
  );
  const [unitForm, setUnitForm] = useState<UnitFormState>({
    ...INITIAL_UNIT_FORM,
    propertyId: unitCreateOptions[0]?.property.id ?? ""
  });
  const [unitBusy, setUnitBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedCreateProperty = useMemo(
    () => unitCreateOptions.find(({ property }) => property.id === unitForm.propertyId) ?? null,
    [unitCreateOptions, unitForm.propertyId]
  );

  function toggleListValue(field: "amenities" | "features", value: string): void {
    setUnitForm((previous) => {
      const items = previous[field];
      return {
        ...previous,
        [field]: items.includes(value)
          ? items.filter((item) => item !== value)
          : [...items, value]
      };
    });
  }

  async function handleCreateUnit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setUnitBusy(true);
    setMessage(null);
    setError(null);

    const unitNumberBase = unitForm.unitNumber.trim();
    if (unitNumberBase.length === 0) {
      setError("Le numéro ou préfixe d'unité est requis.");
      setUnitBusy(false);
      return;
    }

    const monthlyRentAmount = Number(unitForm.monthlyRentAmount);
    if (!Number.isFinite(monthlyRentAmount) || monthlyRentAmount <= 0) {
      setError("Le loyer mensuel doit être un nombre positif.");
      setUnitBusy(false);
      return;
    }

    const depositAmount = Number(unitForm.depositAmount);
    if (!Number.isFinite(depositAmount) || depositAmount < 0) {
      setError("La caution doit être un nombre supérieur ou égal à zéro.");
      setUnitBusy(false);
      return;
    }

    const bedroomCount = parseOptionalNumber(unitForm.bedroomCount);
    if (bedroomCount === undefined) {
      setError("Le nombre de chambres doit être un nombre valide.");
      setUnitBusy(false);
      return;
    }

    const bathroomCount = parseOptionalNumber(unitForm.bathroomCount);
    if (bathroomCount === undefined) {
      setError("Le nombre de salles de bain doit être un nombre valide.");
      setUnitBusy(false);
      return;
    }

    const sizeSqm = parseOptionalNumber(unitForm.sizeSqm);
    if (sizeSqm === undefined) {
      setError("La superficie doit être un nombre valide.");
      setUnitBusy(false);
      return;
    }

    const unitCount = selectedCreateProperty?.property.propertyType === "single_unit"
      ? 1
      : Number(unitForm.unitCount);
    if (!Number.isInteger(unitCount) || unitCount < 1) {
      setError("Le nombre d'unités doit être un entier positif.");
      setUnitBusy(false);
      return;
    }

    if (unitForm.propertyId.trim().length === 0) {
      setError("Veuillez sélectionner un bien.");
      setUnitBusy(false);
      return;
    }

    let createdCount = 0;

    for (let index = 0; index < unitCount; index += 1) {
      const payload = {
        organizationId,
        propertyId: unitForm.propertyId,
        unitNumber: buildUnitNumber(unitNumberBase, index, unitCount),
        monthlyRentAmount,
        depositAmount,
        currencyCode: unitForm.currencyCode.trim().toUpperCase(),
        bedroomCount,
        bathroomCount,
        sizeSqm,
        amenities: unitForm.amenities,
        features: unitForm.features
      };

      const result = await postWithAuth<CreateUnitOutput>("/api/units", payload);

      if (!result.success) {
        setError(
          createdCount > 0
            ? `${createdCount} unité(s) créée(s) avant l'erreur: ${result.error}`
            : result.error
        );
        setUnitBusy(false);
        return;
      }

      createdCount += 1;
    }

    setUnitForm({
      ...INITIAL_UNIT_FORM,
      propertyId: unitForm.propertyId
    });
    setMessage(unitCount === 1 ? "Unité créée avec succès." : `${unitCount} unités créées avec succès.`);
    setUnitBusy(false);
    router.push("/dashboard/properties");
    router.refresh();
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/dashboard/properties" className="mb-4 inline-block text-sm text-[#0063fe] hover:underline">
          ← Retour au portfolio
        </Link>
        <h1 className="text-2xl font-semibold text-[#010a19]">Ajouter une ou plusieurs unités</h1>
        <p className="mt-1 text-sm text-gray-500">Les unités seront ajoutées dans {currentScopeLabel.toLowerCase()}.</p>
      </div>

      <form onSubmit={handleCreateUnit} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4 lg:max-w-5xl">
        <div>
          <h2 className="text-base font-semibold text-[#010a19]">Configuration des unités</h2>
          <p className="mt-1 text-sm text-gray-500">
            Utilisez ce formulaire pour compléter un bien existant. Les photos restent gérées au niveau du bien.
          </p>
        </div>

        <label className="block text-sm font-medium text-gray-700">
          <span className="mb-1.5 block">Bien</span>
          <select
            value={unitForm.propertyId}
            onChange={(event) => {
              const selectedId = event.target.value;
              const selectedOption = unitCreateOptions.find(({ property }) => property.id === selectedId);

              setUnitForm((previous) => ({
                ...previous,
                propertyId: selectedId,
                unitCount: selectedOption?.property.propertyType === "single_unit" ? "1" : previous.unitCount
              }));
            }}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal"
            required
          >
            <option value="">Sélectionner un bien</option>
            {unitCreateOptions.map(({ property }) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
        </label>

        {unitCreateOptions.length === 0 ? (
          <p className="text-sm text-gray-500">
            Aucun bien éligible. Les biens de type simple ne peuvent pas recevoir d'unité supplémentaire.
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="block text-sm font-medium text-gray-700 xl:col-span-2">
            <span className="mb-1.5 block">Numéro ou préfixe d'unité</span>
            <input
              value={unitForm.unitNumber}
              onChange={(event) => setUnitForm((previous) => ({ ...previous, unitNumber: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal"
              placeholder="Numéro ou préfixe d'unité"
              required
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            <span className="mb-1.5 block">Loyer mensuel</span>
            <input
              value={unitForm.monthlyRentAmount}
              onChange={(event) => setUnitForm((previous) => ({ ...previous, monthlyRentAmount: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal"
              placeholder="Loyer mensuel"
              inputMode="decimal"
              required
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            <span className="mb-1.5 block">Caution</span>
            <input
              value={unitForm.depositAmount}
              onChange={(event) => setUnitForm((previous) => ({ ...previous, depositAmount: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal"
              placeholder="Caution"
              inputMode="decimal"
              required
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            <span className="mb-1.5 block">Devise</span>
            <input
              value={unitForm.currencyCode}
              onChange={(event) => setUnitForm((previous) => ({ ...previous, currencyCode: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal uppercase"
              placeholder="Devise"
              maxLength={3}
              required
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            <span className="mb-1.5 block">Chambres</span>
            <input
              value={unitForm.bedroomCount}
              onChange={(event) => setUnitForm((previous) => ({ ...previous, bedroomCount: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal"
              placeholder="Chambres"
              inputMode="numeric"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            <span className="mb-1.5 block">Salles de bain</span>
            <input
              value={unitForm.bathroomCount}
              onChange={(event) => setUnitForm((previous) => ({ ...previous, bathroomCount: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal"
              placeholder="Salles de bain"
              inputMode="decimal"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            <span className="mb-1.5 block">Surface m²</span>
            <input
              value={unitForm.sizeSqm}
              onChange={(event) => setUnitForm((previous) => ({ ...previous, sizeSqm: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal"
              placeholder="Surface m²"
              inputMode="decimal"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            <span className="mb-1.5 block">Nombre d'unités</span>
            <input
              value={unitForm.unitCount}
              onChange={(event) => setUnitForm((previous) => ({ ...previous, unitCount: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal"
              placeholder="Nombre d'unités"
              inputMode="numeric"
              disabled={selectedCreateProperty?.property.propertyType === "single_unit"}
              required
            />
          </label>
        </div>

        <p className="text-sm text-gray-500">
          {selectedCreateProperty?.property.propertyType === "single_unit"
            ? "Ce bien est de type simple: une seule unité peut être créée."
            : "Si vous créez plusieurs unités, le champ numéro sert de préfixe et des suffixes seront ajoutés automatiquement."}
        </p>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-[#010a19]">Équipements de base</h3>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {AMENITY_OPTIONS.map((amenity) => (
                <label key={amenity} className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={unitForm.amenities.includes(amenity)}
                    onChange={() => toggleListValue("amenities", amenity)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span>{amenity}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-[#010a19]">Atouts et finitions</h3>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {FEATURE_OPTIONS.map((feature) => (
                <label key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={unitForm.features.includes(feature)}
                    onChange={() => toggleListValue("features", feature)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span>{feature}</span>
                </label>
              ))}
            </div>
          </div>
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

        <button
          type="submit"
          disabled={unitBusy || unitCreateOptions.length === 0}
          className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white hover:bg-[#0050d0] disabled:opacity-60"
        >
          {unitBusy
            ? "Création..."
            : selectedCreateProperty?.property.propertyType === "multi_unit" && Number(unitForm.unitCount || "1") > 1
              ? "Créer les unités"
              : "Créer l'unité"}
        </button>
      </form>
    </div>
  );
}