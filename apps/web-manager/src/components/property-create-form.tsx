"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CreatePropertyOutput } from "@hhousing/api-contracts";
import type { Owner } from "@hhousing/domain";
import { createSupabaseBrowserClient } from "../lib/supabase/browser";
import { postWithAuth } from "../lib/api-client";
import { AMENITY_OPTIONS, FEATURE_OPTIONS } from "./property-form-options";
import type { PropertyFormState } from "./property-management.types";
import UniversalLoadingState from "./universal-loading-state";
import CitySelect from "./city-select";

type WizardStep = "type" | "where" | "owner" | "rent" | "confirm";

const ALL_WIZARD_STEPS: Array<{ id: WizardStep; label: string }> = [
  { id: "type", label: "Quoi ?" },
  { id: "where", label: "Où ?" },
  { id: "owner", label: "Propriétaire" },
  { id: "rent", label: "Loyer" },
  { id: "confirm", label: "Confirmer" }
];

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
  /** When false (particulier), owner step is hidden if a single org owner exists. */
  managedPropertyMode?: boolean;
  /** When true, return to /onboarding after create. */
  fromOnboarding?: boolean;
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

function formatMoney(amount: string, currencyCode: string): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) {
    return "—";
  }
  return `${value.toLocaleString("fr-FR")} ${currencyCode}`;
}

export default function PropertyCreateForm({
  organizationId,
  owners: initialOwners,
  managedPropertyMode = true,
  fromOnboarding = false
}: PropertyCreateFormProps): React.ReactElement {
  const router = useRouter();
  const showOwnerStep = managedPropertyMode || initialOwners.length > 1;
  const wizardSteps = useMemo(
    () => (showOwnerStep ? ALL_WIZARD_STEPS : ALL_WIZARD_STEPS.filter((step) => step.id !== "owner")),
    [showOwnerStep]
  );

  const [step, setStep] = useState<WizardStep>("type");
  const [propertyForm, setPropertyForm] = useState<PropertyFormState>({
    ...INITIAL_PROPERTY_FORM,
    clientId: initialOwners[0]?.id ?? ""
  });
  const [propertyBusy, setPropertyBusy] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [showAmenities, setShowAmenities] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMultiUnit = propertyForm.propertyType === "multi_unit";
  const stepIndex = wizardSteps.findIndex((item) => item.id === step);
  const selectedOwner = initialOwners.find((owner) => owner.id === propertyForm.clientId) ?? null;

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

  function validateStep(currentStep: WizardStep): string | null {
    if (currentStep === "where") {
      if (!propertyForm.name.trim()) {
        return "Indiquez le nom du bien.";
      }
      if (!propertyForm.address.trim()) {
        return "Indiquez l'adresse du bien.";
      }
      if (!propertyForm.city.trim()) {
        return "Sélectionnez la ville.";
      }
      if (!propertyForm.countryCode.trim()) {
        return "Sélectionnez le pays.";
      }
      const yearBuilt = parseOptionalNumber(propertyForm.yearBuilt);
      if (yearBuilt === undefined) {
        return "L'année de construction doit être un nombre valide.";
      }
      return null;
    }

    if (currentStep === "owner") {
      if (!propertyForm.clientId) {
        return "Sélectionnez le propriétaire du bien.";
      }
      return null;
    }

    if (currentStep === "rent") {
      const monthlyRentAmount = Number(propertyForm.monthlyRentAmount);
      if (!Number.isFinite(monthlyRentAmount) || monthlyRentAmount <= 0) {
        return "Le loyer mensuel doit être un nombre positif.";
      }
      const depositAmount = Number(propertyForm.depositAmount);
      if (!Number.isFinite(depositAmount) || depositAmount < 0) {
        return "La caution doit être un nombre supérieur ou égal à zéro.";
      }
      if (!propertyForm.currencyCode.trim()) {
        return "Choisissez la devise du loyer.";
      }
      const bedroomCount = parseOptionalNumber(propertyForm.bedroomCount);
      if (bedroomCount === undefined) {
        return "Le nombre de chambres doit être un nombre valide.";
      }
      const bathroomCount = parseOptionalNumber(propertyForm.bathroomCount);
      if (bathroomCount === undefined) {
        return "Le nombre de salles de bain doit être un nombre valide.";
      }
      const sizeSqm = parseOptionalNumber(propertyForm.sizeSqm);
      if (sizeSqm === undefined) {
        return "La superficie doit être un nombre valide.";
      }
      const unitCount = isMultiUnit ? Number(propertyForm.unitCount) : 1;
      if (!Number.isInteger(unitCount) || unitCount < 1) {
        return "Le nombre d'unités doit être un entier positif.";
      }
      return null;
    }

    return null;
  }

  function goNext(): void {
    setError(null);
    const validationError = validateStep(step);
    if (validationError) {
      setError(validationError);
      return;
    }
    const next = wizardSteps[stepIndex + 1];
    if (next) {
      setStep(next.id);
    }
  }

  function goBack(): void {
    setError(null);
    const previous = wizardSteps[stepIndex - 1];
    if (previous) {
      setStep(previous.id);
    }
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

  async function handleConfirm(): Promise<void> {
    setPropertyBusy(true);
    setError(null);

    for (const wizardStep of wizardSteps) {
      if (wizardStep.id === "type" || wizardStep.id === "confirm") {
        continue;
      }
      const validationError = validateStep(wizardStep.id);
      if (validationError) {
        setError(validationError);
        setStep(wizardStep.id);
        setPropertyBusy(false);
        return;
      }
    }

    if (!propertyForm.clientId) {
      setError("Sélectionnez le propriétaire du bien.");
      setStep(showOwnerStep ? "owner" : "where");
      setPropertyBusy(false);
      return;
    }

    const monthlyRentAmount = Number(propertyForm.monthlyRentAmount);
    const depositAmount = Number(propertyForm.depositAmount);
    const yearBuilt = parseOptionalNumber(propertyForm.yearBuilt);
    const bedroomCount = parseOptionalNumber(propertyForm.bedroomCount);
    const bathroomCount = parseOptionalNumber(propertyForm.bathroomCount);
    const sizeSqm = parseOptionalNumber(propertyForm.sizeSqm);
    const unitCount = isMultiUnit ? Number(propertyForm.unitCount) : 1;

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

    router.push(fromOnboarding ? "/onboarding" : "/dashboard/properties");
    router.refresh();
  }

  const typeLabel = isMultiUnit ? "Immeuble multi-unités" : "Bien simple";
  const currencyLabel = propertyForm.currencyCode === "USD" ? "USD (Dollar)" : "CDF (Franc congolais)";
  const extrasSummary = [
    propertyForm.amenities.length > 0 ? `${propertyForm.amenities.length} équipement${propertyForm.amenities.length > 1 ? "s" : ""}` : null,
    propertyForm.features.length > 0 ? `${propertyForm.features.length} atout${propertyForm.features.length > 1 ? "s" : ""}` : null,
    photos.length > 0 ? `${photos.length} photo${photos.length > 1 ? "s" : ""}` : null
  ].filter(Boolean).join(" · ") || "Aucun (peut attendre)";

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6 max-w-2xl">
        <Link
          href={fromOnboarding ? "/onboarding" : "/dashboard/properties"}
          className="mb-4 inline-block text-sm text-[#0063fe] hover:underline"
        >
          {fromOnboarding ? "← Retour à la configuration" : "← Retour à mes biens"}
        </Link>
        <h1 className="text-2xl font-semibold text-[#010a19]">
          {fromOnboarding ? "Premier bien" : "Ajouter un bien"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Suivez les étapes. Une seule décision à la fois.
        </p>
      </div>

      <div className="mb-6 max-w-2xl">
        <div className="flex items-center gap-1 sm:gap-2">
          {wizardSteps.map((wizardStep, index) => {
            const isCurrent = wizardStep.id === step;
            const isDone = index < stepIndex;
            return (
              <div key={wizardStep.id} className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
                <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                      isCurrent
                        ? "bg-[#0063fe] text-white"
                        : isDone
                          ? "bg-[#0063fe]/15 text-[#0063fe]"
                          : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <span className={`hidden truncate text-xs sm:block ${isCurrent ? "font-semibold text-[#010a19]" : "text-slate-500"}`}>
                    {wizardStep.label}
                  </span>
                </div>
                {index < wizardSteps.length - 1 ? (
                  <div className={`mb-4 hidden h-0.5 flex-1 sm:block ${isDone ? "bg-[#0063fe]/40" : "bg-slate-200"}`} />
                ) : null}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-center text-sm font-medium text-[#010a19] sm:hidden">
          Étape {stepIndex + 1} sur {wizardSteps.length} · {wizardSteps[stepIndex]?.label}
        </p>
      </div>

      <div className="max-w-2xl space-y-5">
        {step === "type" ? (
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-[#010a19]">Quel type de bien ?</h2>
              <p className="mt-1 text-sm text-slate-600">Choisissez le cas qui correspond à votre situation.</p>
            </div>
            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => setPropertyForm((previous) => ({ ...previous, propertyType: "single_unit", unitCount: "1" }))}
                className={`rounded-xl border px-4 py-4 text-left transition ${
                  propertyForm.propertyType === "single_unit"
                    ? "border-[#0063fe] bg-[#0063fe]/5 ring-2 ring-[#0063fe]/20"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <p className="font-semibold text-[#010a19]">Bien simple</p>
                <p className="mt-1 text-sm text-slate-600">
                  Une maison, un appartement ou un local unique à louer.
                </p>
              </button>
              <button
                type="button"
                onClick={() =>
                  setPropertyForm((previous) => ({
                    ...previous,
                    propertyType: "multi_unit",
                    unitCount: previous.unitCount === "1" ? "2" : previous.unitCount
                  }))
                }
                className={`rounded-xl border px-4 py-4 text-left transition ${
                  propertyForm.propertyType === "multi_unit"
                    ? "border-[#0063fe] bg-[#0063fe]/5 ring-2 ring-[#0063fe]/20"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <p className="font-semibold text-[#010a19]">Immeuble multi-unités</p>
                <p className="mt-1 text-sm text-slate-600">
                  Plusieurs appartements ou studios dans le même immeuble, avec un modèle de loyer commun.
                </p>
              </button>
            </div>
          </section>
        ) : null}

        {step === "where" ? (
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-[#010a19]">Où est le bien ?</h2>
              <p className="mt-1 text-sm text-slate-600">Nom et adresse pour le retrouver facilement.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <PropertyFieldLabel icon="portfolio" label="Nom du bien" />
                <input
                  value={propertyForm.name}
                  onChange={(event) => setPropertyForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                  placeholder="Ex. Résidence Gombe, Villa Limete"
                  autoFocus
                />
              </label>
              <label className="block sm:col-span-2">
                <PropertyFieldLabel icon="address" label="Adresse" />
                <input
                  value={propertyForm.address}
                  onChange={(event) => setPropertyForm((prev) => ({ ...prev, address: event.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                  placeholder="Avenue, quartier, commune"
                />
              </label>
              <div className="block">
                <PropertyFieldLabel icon="city" label="Ville" />
                <CitySelect
                  value={propertyForm.city}
                  onChange={(value) => setPropertyForm((prev) => ({ ...prev, city: value }))}
                />
              </div>
              <label className="block">
                <PropertyFieldLabel icon="country" label="Pays" />
                <select
                  value={propertyForm.countryCode}
                  onChange={(event) => setPropertyForm((prev) => ({ ...prev, countryCode: event.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm bg-white outline-none focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15"
                >
                  <option value="CD">République Démocratique du Congo (RDC)</option>
                </select>
              </label>
              <label className="block sm:col-span-2">
                <PropertyFieldLabel icon="year" label="Année de construction (optionnel)" />
                <input
                  type="number"
                  min="1800"
                  max="2200"
                  value={propertyForm.yearBuilt}
                  onChange={(event) => setPropertyForm((prev) => ({ ...prev, yearBuilt: event.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                  placeholder="Ex. 2018"
                />
              </label>
            </div>
          </section>
        ) : null}

        {step === "owner" ? (
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-[#010a19]">Qui est le propriétaire ?</h2>
              <p className="mt-1 text-sm text-slate-600">
                Le bien sera rattaché à ce propriétaire dans vos biens.
              </p>
            </div>
            <label className="block">
              <PropertyFieldLabel icon="owner" label="Propriétaire" />
              <select
                value={propertyForm.clientId}
                onChange={(event) => setPropertyForm((prev) => ({ ...prev, clientId: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
              >
                <option value="">Sélectionner un propriétaire</option>
                {initialOwners.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.name}
                    {owner.ownerType === "organization" ? " · votre organisation" : " · client"}
                  </option>
                ))}
              </select>
            </label>
            {initialOwners.length === 0 ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Aucun propriétaire disponible. Créez d&apos;abord un propriétaire dans Clients.
              </p>
            ) : null}
          </section>
        ) : null}

        {step === "rent" ? (
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-[#010a19]">Combien louez-vous ?</h2>
              <p className="mt-1 text-sm text-slate-600">
                {isMultiUnit
                  ? "Ces infos s'appliquent à toutes les unités créées."
                  : "Ces infos s'appliquent à l'unité principale."}
              </p>
            </div>

            <div className="rounded-lg border border-dashed border-gray-300 px-4 py-3">
              <p className="text-sm font-medium text-[#010a19]">En quelle devise percevez-vous le loyer ?</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setPropertyForm((prev) => ({ ...prev, currencyCode: "CDF" }))}
                  className={`rounded-lg border px-3 py-3 text-left text-sm transition ${
                    propertyForm.currencyCode === "CDF"
                      ? "border-[#0063fe] bg-[#0063fe]/5 ring-2 ring-[#0063fe]/20"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="font-semibold text-[#010a19]">CDF</span>
                  <span className="mt-0.5 block text-slate-500">Franc congolais</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPropertyForm((prev) => ({ ...prev, currencyCode: "USD" }))}
                  className={`rounded-lg border px-3 py-3 text-left text-sm transition ${
                    propertyForm.currencyCode === "USD"
                      ? "border-[#0063fe] bg-[#0063fe]/5 ring-2 ring-[#0063fe]/20"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="font-semibold text-[#010a19]">USD</span>
                  <span className="mt-0.5 block text-slate-500">Dollar américain</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <PropertyFieldLabel icon="rent" label="Loyer mensuel" />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={propertyForm.monthlyRentAmount}
                  onChange={(event) => setPropertyForm((prev) => ({ ...prev, monthlyRentAmount: event.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                  placeholder="Montant"
                  autoFocus
                />
              </label>
              <label className="block">
                <PropertyFieldLabel icon="deposit" label="Garantie" />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={propertyForm.depositAmount}
                  onChange={(event) => setPropertyForm((prev) => ({ ...prev, depositAmount: event.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                  placeholder="Montant"
                />
              </label>
              <label className="block">
                <PropertyFieldLabel icon="bed" label="Chambres (optionnel)" />
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={propertyForm.bedroomCount}
                  onChange={(event) => setPropertyForm((prev) => ({ ...prev, bedroomCount: event.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                  placeholder="Ex. 2"
                />
              </label>
              <label className="block">
                <PropertyFieldLabel icon="bath" label="Salles de bain (optionnel)" />
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={propertyForm.bathroomCount}
                  onChange={(event) => setPropertyForm((prev) => ({ ...prev, bathroomCount: event.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                  placeholder="Ex. 1"
                />
              </label>
              <label className="block">
                <PropertyFieldLabel icon="size" label="Surface m² (optionnel)" />
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={propertyForm.sizeSqm}
                  onChange={(event) => setPropertyForm((prev) => ({ ...prev, sizeSqm: event.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                  placeholder="Ex. 85"
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
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                    placeholder="Ex. 8"
                  />
                </label>
              ) : null}
            </div>

            <div>
              <button
                type="button"
                onClick={() => setShowAmenities((previous) => !previous)}
                className="text-sm font-medium text-[#0063fe] hover:underline"
              >
                {showAmenities ? "Masquer les équipements" : "Ajouter des équipements (optionnel)"}
              </button>
              {showAmenities ? (
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border border-gray-200 p-4">
                    <h3 className="text-sm font-semibold text-[#010a19]">Équipements de base</h3>
                    <div className="mt-3 grid grid-cols-1 gap-2">
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
                    <div className="mt-3 grid grid-cols-1 gap-2">
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
              ) : null}
            </div>
          </section>
        ) : null}

        {step === "confirm" ? (
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-[#010a19]">Confirmer</h2>
              <p className="mt-1 text-sm text-slate-600">Vérifiez le résumé avant de créer le bien.</p>
            </div>

            <dl className="space-y-3 rounded-lg border border-gray-100 bg-slate-50 px-4 py-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Type</dt>
                <dd className="text-right font-medium text-[#010a19]">{typeLabel}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Bien</dt>
                <dd className="text-right font-medium text-[#010a19]">{propertyForm.name.trim() || "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Adresse</dt>
                <dd className="text-right font-medium text-[#010a19]">
                  {[propertyForm.address.trim(), propertyForm.city.trim()].filter(Boolean).join(", ") || "—"}
                </dd>
              </div>
              {showOwnerStep ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Propriétaire</dt>
                  <dd className="text-right font-medium text-[#010a19]">{selectedOwner?.name ?? "—"}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Loyer</dt>
                <dd className="text-right font-medium text-[#010a19]">
                  {formatMoney(propertyForm.monthlyRentAmount, propertyForm.currencyCode)} / mois
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Garantie</dt>
                <dd className="text-right font-medium text-[#010a19]">
                  {formatMoney(propertyForm.depositAmount, propertyForm.currencyCode)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Devise</dt>
                <dd className="text-right font-medium text-[#010a19]">{currencyLabel}</dd>
              </div>
              {isMultiUnit ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Unités</dt>
                  <dd className="text-right font-medium text-[#010a19]">{propertyForm.unitCount}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Extras</dt>
                <dd className="text-right font-medium text-[#010a19]">{extrasSummary}</dd>
              </div>
            </dl>

            <div className="space-y-3 rounded-lg border border-dashed border-gray-300 px-4 py-3">
              <p className="text-sm font-medium text-[#010a19]">Photos (optionnel — peut attendre)</p>
              <label className="block">
                <PropertyFieldLabel icon="photo" label="Photos du bien" />
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => setPhotos(Array.from(event.target.files ?? []))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
              {photos.length > 0 ? (
                <p className="text-sm text-slate-500">
                  {photos.length} photo{photos.length > 1 ? "s" : ""} sélectionnée{photos.length > 1 ? "s" : ""}.
                  Elles seront partagées par {isMultiUnit ? "toutes les unités" : "l'unité"} de ce bien.
                </p>
              ) : (
                <p className="text-sm text-slate-500">Vous pourrez ajouter des photos plus tard depuis la fiche du bien.</p>
              )}
            </div>
          </section>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          {stepIndex > 0 ? (
            <button
              type="button"
              onClick={goBack}
              disabled={propertyBusy}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              Retour
            </button>
          ) : (
            <span />
          )}
          {step === "confirm" ? (
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={propertyBusy}
              className="rounded-lg bg-[#0063fe] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0050d0] disabled:opacity-60"
            >
              Créer le bien
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              disabled={propertyBusy}
              className="rounded-lg bg-[#0063fe] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0050d0] disabled:opacity-60"
            >
              Continuer
            </button>
          )}
        </div>
      </div>

      {propertyBusy ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#010a19]/35 backdrop-blur-[1px]">
          <UniversalLoadingState minHeightClassName="min-h-0" className="h-full w-full" />
        </div>
      ) : null}
    </div>
  );
}
