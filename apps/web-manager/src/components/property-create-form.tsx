"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CreatePropertyOutput } from "@hhousing/api-contracts";
import type { Owner } from "@hhousing/domain";
import { createSupabaseBrowserClient } from "../lib/supabase/browser";
import { postWithAuth } from "../lib/api-client";
import { AMENITY_OPTIONS, FEATURE_OPTIONS } from "./property-form-options";
import type { PropertyFormState } from "./property-management.types";
import UniversalLoadingState from "./universal-loading-state";

const INITIAL_PROPERTY_FORM: PropertyFormState = {
  name: "",
  address: "",
  city: "",
  countryCode: "CD",
  clientId: "",
  propertyType: "single_unit",
  yearBuilt: "",
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

interface PropertyCreateFormProps {
  organizationId: string;
  owners: Owner[];
}

type PropertyFieldIconName =
  | "portfolio"
  | "address"
  | "city"
  | "country"
  | "year"
  | "photo"
  | "owner"
  | "rent"
  | "deposit"
  | "currency"
  | "bed"
  | "bath"
  | "size"
  | "units";

function PropertyFieldIcon({ name }: { name: PropertyFieldIconName }): React.ReactElement {
  switch (name) {
    case "portfolio":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-slate-500" aria-hidden="true">
          <path d="M4 20.5V9.5L12 4l8 5.5v11" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M9 20.5v-5h6v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "address":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-slate-500" aria-hidden="true">
          <path d="M5 18.5V5.5h14v13" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M8 9.5h8M8 13h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "city":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-slate-500" aria-hidden="true">
          <path d="M7 4.5h10v15H7z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M10 9h4M10 12.5h4M10 16h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "country":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-slate-500" aria-hidden="true">
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
          <rect x="13.5" y="3.5" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
          <rect x="13.5" y="11.5" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case "year":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-slate-500" aria-hidden="true">
          <path d="M7 3.5h7l4 4v13H7z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M14 3.5v4h4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M9.5 12h5M9.5 15.5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "photo":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-slate-500" aria-hidden="true">
          <path d="M8 3.5h6l4 4v9.5A3.5 3.5 0 0 1 14.5 20.5H8.5A3.5 3.5 0 0 1 5 17V7a3.5 3.5 0 0 1 3-3.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M14 3.5v4h4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M9 13.5h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "owner":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-slate-500" aria-hidden="true">
          <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
          <path d="M4.5 18.5c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M16 10.5c1.9 0 3.5 1.6 3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M15 5.5c1.4.2 2.5 1.4 2.5 2.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "rent":
    case "deposit":
    case "currency":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-slate-500" aria-hidden="true">
          <rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <path d="M4 10h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M8 14.5h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "bed":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-slate-500" aria-hidden="true">
          <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M5.5 19c0-3.2 2.9-5.5 6.5-5.5s6.5 2.3 6.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "bath":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-slate-500" aria-hidden="true">
          <path d="M14.5 6.5a3 3 0 0 1 3.9 3.9l-7.8 7.8-4.6 1 1-4.6 7.5-7.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M13 8l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "size":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-slate-500" aria-hidden="true">
          <path d="M4 18.5h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M6.5 15l4-4 3 2.5 4.5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15.5 8.5H18v2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "units":
      return (
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-slate-500" aria-hidden="true">
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
          <rect x="13.5" y="3.5" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
          <rect x="13.5" y="11.5" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
  }
}

function PropertyFieldLabel({ icon, label }: { icon: PropertyFieldIconName; label: string }): React.ReactElement {
  return (
    <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
      <PropertyFieldIcon name={icon} />
      <span>{label}</span>
    </span>
  );
}

export default function PropertyCreateForm({
  organizationId,
  owners: initialOwners,
}: PropertyCreateFormProps): React.ReactElement {
  const router = useRouter();
  const [propertyForm, setPropertyForm] = useState<PropertyFormState>({
    ...INITIAL_PROPERTY_FORM,
    clientId: initialOwners[0]?.id ?? ""
  });
  const [propertyBusy, setPropertyBusy] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isMultiUnit = propertyForm.propertyType === "multi_unit";

  function toggleListValue(field: "amenities" | "features", value: string): void {
    setPropertyForm((previous) => {
      const items = previous[field];
      return {
        ...previous,
        [field]: items.includes(value)
          ? items.filter((item) => item !== value)
          : [...items, value]
      };
    });
  }

  function parseOptionalNumber(value: string): number | null | undefined {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return null;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  async function uploadPhotos(): Promise<string[]> {
    if (photos.length === 0) {
      return [];
    }

    const supabase = createSupabaseBrowserClient();

    return Promise.all(
      photos.map(async (file, index) => {
        const filePath = `${organizationId}/property-photos/${Date.now()}-${index}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, file);

        if (uploadError) {
          if (uploadError.message.toLowerCase().includes("row-level security policy")) {
            throw new Error(
              "Upload bloqué par Supabase Storage RLS. Ajoutez une policy INSERT pour le bucket 'documents' (rôle authenticated)."
            );
          }

          throw new Error(`Erreur de téléchargement: ${uploadError.message}`);
        }

        const {
          data: { publicUrl }
        } = supabase.storage.from("documents").getPublicUrl(filePath);

        return publicUrl;
      })
    );
  }

  async function handleCreateProperty(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setPropertyBusy(true);
    setError(null);

    const monthlyRentAmount = Number(propertyForm.monthlyRentAmount);
    if (!Number.isFinite(monthlyRentAmount) || monthlyRentAmount <= 0) {
      setError("Le loyer mensuel doit être un nombre positif.");
      setPropertyBusy(false);
      return;
    }

    const depositAmount = Number(propertyForm.depositAmount);
    if (!Number.isFinite(depositAmount) || depositAmount < 0) {
      setError("La caution doit être un nombre supérieur ou égal à zéro.");
      setPropertyBusy(false);
      return;
    }

    const yearBuilt = parseOptionalNumber(propertyForm.yearBuilt);
    if (yearBuilt === undefined) {
      setError("L'année de construction doit être un nombre valide.");
      setPropertyBusy(false);
      return;
    }

    const bedroomCount = parseOptionalNumber(propertyForm.bedroomCount);
    if (bedroomCount === undefined) {
      setError("Le nombre de chambres doit être un nombre valide.");
      setPropertyBusy(false);
      return;
    }

    const bathroomCount = parseOptionalNumber(propertyForm.bathroomCount);
    if (bathroomCount === undefined) {
      setError("Le nombre de salles de bain doit être un nombre valide.");
      setPropertyBusy(false);
      return;
    }

    const sizeSqm = parseOptionalNumber(propertyForm.sizeSqm);
    if (sizeSqm === undefined) {
      setError("La superficie doit être un nombre valide.");
      setPropertyBusy(false);
      return;
    }

    const unitCount = isMultiUnit ? Number(propertyForm.unitCount) : 1;
    if (!Number.isInteger(unitCount) || unitCount < 1) {
      setError("Le nombre d'unités doit être un entier positif.");
      setPropertyBusy(false);
      return;
    }

    let photoUrls: string[] = [];

    try {
      photoUrls = await uploadPhotos();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Erreur de téléchargement des photos.");
      setPropertyBusy(false);
      return;
    }

    const payload = {
      organizationId,
      name: propertyForm.name.trim(),
      address: propertyForm.address.trim(),
      city: propertyForm.city.trim(),
      countryCode: propertyForm.countryCode.trim().toUpperCase(),
      ownerId: propertyForm.clientId,
      propertyType: propertyForm.propertyType,
      yearBuilt,
      photoUrls,
      unitTemplate: {
        monthlyRentAmount,
        depositAmount,
        currencyCode: propertyForm.currencyCode.trim().toUpperCase(),
        bedroomCount,
        bathroomCount,
        sizeSqm,
        amenities: propertyForm.amenities,
        features: propertyForm.features,
        unitCount
      }
    };

    const result = await postWithAuth<CreatePropertyOutput>("/api/properties", payload);

    if (!result.success) {
      setError(result.error);
      setPropertyBusy(false);
      return;
    }

    router.push("/dashboard/properties");
    router.refresh();
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/dashboard/properties" className="text-sm text-[#0063fe] hover:underline mb-4 inline-block">
          ← Retour au portfolio
        </Link>
        <h1 className="text-2xl font-semibold text-[#010a19]">Ajouter un bien</h1>
        <p className="mt-1 text-sm text-gray-500">Chaque bien est maintenant rattaché à un owner explicite.</p>
      </div>

      <form onSubmit={handleCreateProperty} className="space-y-5 lg:max-w-5xl">
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#010a19]">Fiche du bien</h2>
              <p className="text-sm text-gray-500">Définissez le bien, puis les informations partagées par les unités créées.</p>
            </div>
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
              <button
                type="button"
                onClick={() => setPropertyForm((previous) => ({ ...previous, propertyType: "single_unit", unitCount: "1" }))}
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  propertyForm.propertyType === "single_unit" ? "bg-[#0063fe] text-white" : "text-gray-600"
                }`}
              >
                Bien simple
              </button>
              <button
                type="button"
                onClick={() => setPropertyForm((previous) => ({ ...previous, propertyType: "multi_unit", unitCount: previous.unitCount === "1" ? "2" : previous.unitCount }))}
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  propertyForm.propertyType === "multi_unit" ? "bg-[#0063fe] text-white" : "text-gray-600"
                }`}
              >
                Immeuble multi-unités
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="block">
              <PropertyFieldLabel icon="portfolio" label="Nom du bien" />
              <input
                value={propertyForm.name}
                onChange={(event) => setPropertyForm((prev) => ({ ...prev, name: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Nom du bien"
                required
              />
            </label>
            <label className="block">
              <PropertyFieldLabel icon="address" label="Adresse" />
              <input
                value={propertyForm.address}
                onChange={(event) => setPropertyForm((prev) => ({ ...prev, address: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Adresse"
                required
              />
            </label>
            <label className="block">
              <PropertyFieldLabel icon="city" label="Ville" />
              <input
                value={propertyForm.city}
                onChange={(event) => setPropertyForm((prev) => ({ ...prev, city: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Ville"
                required
              />
            </label>
            <label className="block">
              <PropertyFieldLabel icon="country" label="Code pays" />
              <input
                value={propertyForm.countryCode}
                onChange={(event) => setPropertyForm((prev) => ({ ...prev, countryCode: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase"
                placeholder="Code pays"
                maxLength={2}
                required
              />
            </label>
            <label className="block">
              <PropertyFieldLabel icon="year" label="Année de construction" />
              <input
                type="number"
                min="1800"
                max="2200"
                value={propertyForm.yearBuilt}
                onChange={(event) => setPropertyForm((prev) => ({ ...prev, yearBuilt: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Année de construction"
              />
            </label>
            <label className="block xl:col-span-3">
              <PropertyFieldLabel icon="photo" label="Photos du bien" />
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => setPhotos(Array.from(event.target.files ?? []))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
          </div>

          {photos.length > 0 ? (
            <p className="text-sm text-gray-500">
              {photos.length} photo{photos.length > 1 ? "s" : ""} sélectionnée{photos.length > 1 ? "s" : ""}. Elles seront partagées par toutes les unités de ce bien.
            </p>
          ) : null}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-3">
          <div>
            <h2 className="text-base font-semibold text-[#010a19]">Owner</h2>
            <p className="text-sm text-gray-500">Associez le bien à un owner existant.</p>
          </div>
          <label className="block">
            <PropertyFieldLabel icon="owner" label="Owner" />
            <select
              value={propertyForm.clientId}
              onChange={(event) => setPropertyForm((prev) => ({ ...prev, clientId: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              required
            >
              <option value="">Sélectionner un owner</option>
              {initialOwners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name}{owner.ownerType === "organization" ? " · organisation" : " · client"}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-semibold text-[#010a19]">Modèle d'unité</h2>
            <p className="text-sm text-gray-500">
              Ces informations seront appliquées à {isMultiUnit ? "toutes les unités créées" : "l'unité principale"}.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            <label className="block">
              <PropertyFieldLabel icon="rent" label="Loyer mensuel" />
              <input
                type="number"
                min="0"
                step="0.01"
                value={propertyForm.monthlyRentAmount}
                onChange={(event) => setPropertyForm((prev) => ({ ...prev, monthlyRentAmount: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Loyer mensuel"
                required
              />
            </label>
            <label className="block">
              <PropertyFieldLabel icon="deposit" label="Caution" />
              <input
                type="number"
                min="0"
                step="0.01"
                value={propertyForm.depositAmount}
                onChange={(event) => setPropertyForm((prev) => ({ ...prev, depositAmount: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Caution"
                required
              />
            </label>
            <label className="block">
              <PropertyFieldLabel icon="currency" label="Devise" />
              <input
                value={propertyForm.currencyCode}
                onChange={(event) => setPropertyForm((prev) => ({ ...prev, currencyCode: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase"
                placeholder="Devise"
                maxLength={3}
                required
              />
            </label>
            <label className="block">
              <PropertyFieldLabel icon="bed" label="Chambres" />
              <input
                type="number"
                min="0"
                step="1"
                value={propertyForm.bedroomCount}
                onChange={(event) => setPropertyForm((prev) => ({ ...prev, bedroomCount: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Chambres"
              />
            </label>
            <label className="block">
              <PropertyFieldLabel icon="bath" label="Salles de bain" />
              <input
                type="number"
                min="0"
                step="0.5"
                value={propertyForm.bathroomCount}
                onChange={(event) => setPropertyForm((prev) => ({ ...prev, bathroomCount: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Salles de bain"
              />
            </label>
            <label className="block">
              <PropertyFieldLabel icon="size" label="Surface m²" />
              <input
                type="number"
                min="0"
                step="0.1"
                value={propertyForm.sizeSqm}
                onChange={(event) => setPropertyForm((prev) => ({ ...prev, sizeSqm: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Surface m²"
              />
            </label>
            {isMultiUnit ? (
              <label className="block">
                <PropertyFieldLabel icon="units" label="Nombre d'unités" />
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={propertyForm.unitCount}
                  onChange={(event) => setPropertyForm((prev) => ({ ...prev, unitCount: event.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Nombre d'unités"
                  required
                />
              </label>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-[#010a19]">Équipements de base</h3>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {AMENITY_OPTIONS.map((amenity) => (
                  <label key={amenity} className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={propertyForm.amenities.includes(amenity)}
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
                      checked={propertyForm.features.includes(feature)}
                      onChange={() => toggleListValue("features", feature)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span>{feature}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={propertyBusy}
          className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white hover:bg-[#0050d0] disabled:opacity-60"
        >
          Creer le bien
        </button>
      </form>

      {propertyBusy ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#010a19]/35 backdrop-blur-[1px]">
          <UniversalLoadingState minHeightClassName="min-h-0" className="h-full w-full" />
        </div>
      ) : null}
    </div>
  );
}