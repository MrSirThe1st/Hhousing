"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CreatePropertyOutput } from "@hhousing/api-contracts";
import type { OwnerClient } from "@hhousing/domain";
import { createSupabaseBrowserClient } from "../lib/supabase/browser";
import { postWithAuth } from "../lib/api-client";
import type { OperatorScope } from "../lib/operator-context.types";
import { AMENITY_OPTIONS, FEATURE_OPTIONS } from "./property-form-options";
import type { PropertyFormState } from "./property-management.types";

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
  currentScope: OperatorScope;
  currentScopeLabel: string;
  ownerClients: OwnerClient[];
}

export default function PropertyCreateForm({
  organizationId,
  currentScope,
  currentScopeLabel,
  ownerClients: initialOwnerClients,
}: PropertyCreateFormProps): React.ReactElement {
  const router = useRouter();
  const [propertyForm, setPropertyForm] = useState<PropertyFormState>(INITIAL_PROPERTY_FORM);
  const [propertyBusy, setPropertyBusy] = useState(false);
  const [clientBusy, setClientBusy] = useState(false);
  const [ownerClients, setOwnerClients] = useState<OwnerClient[]>(initialOwnerClients);
  const [newClientName, setNewClientName] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isManagedScope = currentScope === "managed";
  const isMultiUnit = propertyForm.propertyType === "multi_unit";

  function getCreateButtonLabel(scope: OperatorScope): string {
    return scope === "owned" ? "Creer la propriete" : "Creer le bien gere";
  }

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
      managementContext: currentScope,
      propertyType: propertyForm.propertyType,
      yearBuilt,
      photoUrls,
      clientId: isManagedScope ? (propertyForm.clientId || null) : null,
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

  async function handleCreateOwnerClient(): Promise<void> {
    setClientBusy(true);
    setError(null);

    const result = await postWithAuth<OwnerClient>("/api/owner-clients", {
      organizationId,
      name: newClientName.trim()
    });

    if (!result.success) {
      setError(result.error);
      setClientBusy(false);
      return;
    }

    setOwnerClients((previous) => [...previous, result.data].sort((left, right) => left.name.localeCompare(right.name, "fr")));
    setPropertyForm((previous) => ({ ...previous, clientId: result.data.id }));
    setNewClientName("");
    setClientBusy(false);
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/dashboard/properties" className="text-sm text-[#0063fe] hover:underline mb-4 inline-block">
          ← Retour au portfolio
        </Link>
        <h1 className="text-2xl font-semibold text-[#010a19]">Ajouter un bien</h1>
        <p className="mt-1 text-sm text-gray-500">Ce nouveau bien sera classé dans {currentScopeLabel.toLowerCase()}.</p>
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
            <input
              value={propertyForm.name}
              onChange={(event) => setPropertyForm((prev) => ({ ...prev, name: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Nom du bien"
              required
            />
            <input
              value={propertyForm.address}
              onChange={(event) => setPropertyForm((prev) => ({ ...prev, address: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Adresse"
              required
            />
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
            <input
              type="number"
              min="1800"
              max="2200"
              value={propertyForm.yearBuilt}
              onChange={(event) => setPropertyForm((prev) => ({ ...prev, yearBuilt: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Année de construction"
            />
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => setPhotos(Array.from(event.target.files ?? []))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm xl:col-span-3"
            />
          </div>

          {photos.length > 0 ? (
            <p className="text-sm text-gray-500">
              {photos.length} photo{photos.length > 1 ? "s" : ""} sélectionnée{photos.length > 1 ? "s" : ""}. Elles seront partagées par toutes les unités de ce bien.
            </p>
          ) : null}
        </section>

        {isManagedScope ? (
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-3">
            <div>
              <h2 className="text-base font-semibold text-[#010a19]">Client géré</h2>
              <p className="text-sm text-gray-500">Associez le bien à un client existant ou créez-en un à la volée.</p>
            </div>
            <select
              value={propertyForm.clientId}
              onChange={(event) => setPropertyForm((prev) => ({ ...prev, clientId: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Aucun client lie</option>
              {ownerClients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <input
                value={newClientName}
                onChange={(event) => setNewClientName(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Créer un nouveau client"
              />
              <button
                type="button"
                onClick={() => {
                  void handleCreateOwnerClient();
                }}
                disabled={clientBusy || newClientName.trim().length === 0}
                className="rounded-lg border border-[#0063fe] px-3 py-2 text-sm font-medium text-[#0063fe] hover:bg-[#0063fe]/5 disabled:opacity-60"
              >
                {clientBusy ? "Creation..." : "Ajouter"}
              </button>
            </div>
          </section>
        ) : null}

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-semibold text-[#010a19]">Modèle d'unité</h2>
            <p className="text-sm text-gray-500">
              Ces informations seront appliquées à {isMultiUnit ? "toutes les unités créées" : "l'unité principale"}.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
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
            <input
              value={propertyForm.currencyCode}
              onChange={(event) => setPropertyForm((prev) => ({ ...prev, currencyCode: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase"
              placeholder="Devise"
              maxLength={3}
              required
            />
            <input
              type="number"
              min="0"
              step="1"
              value={propertyForm.bedroomCount}
              onChange={(event) => setPropertyForm((prev) => ({ ...prev, bedroomCount: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Chambres"
            />
            <input
              type="number"
              min="0"
              step="0.5"
              value={propertyForm.bathroomCount}
              onChange={(event) => setPropertyForm((prev) => ({ ...prev, bathroomCount: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Salles de bain"
            />
            <input
              type="number"
              min="0"
              step="0.1"
              value={propertyForm.sizeSqm}
              onChange={(event) => setPropertyForm((prev) => ({ ...prev, sizeSqm: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Surface m²"
            />
            {isMultiUnit ? (
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
          {propertyBusy ? "Creation en cours..." : getCreateButtonLabel(currentScope)}
        </button>
      </form>
    </div>
  );
}