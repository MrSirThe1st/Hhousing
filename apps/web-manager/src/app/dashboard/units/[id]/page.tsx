"use client";

import { use, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ReactElement, FormEvent } from "react";
import type { Property, Unit } from "@hhousing/domain";
import { deleteWithAuth, patchWithAuth } from "../../../../lib/api-client";
import ActionMenu from "../../../../components/action-menu";
import UniversalLoadingState from "../../../../components/universal-loading-state";

const ContextualDocumentPanel = dynamic(
  () => import("../../../../components/contextual-document-panel"),
  { ssr: false }
);

type PageProps = {
  params: Promise<{ id: string }>;
};

type UnitFormData = {
  propertyId: string;
  unitNumber: string;
  monthlyRentAmount: number;
  currencyCode: string;
  status: "vacant" | "occupied" | "inactive";
};

type IconProps = {
  className?: string;
};

function formatCurrencyAmount(amount: number, currencyCode: string): string {
  return `${amount.toLocaleString("fr-FR")} ${currencyCode}`;
}

function getUnitStatusClassName(status: Unit["status"]): string {
  if (status === "occupied") {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
  }

  if (status === "vacant") {
    return "bg-blue-50 text-[#0063fe] ring-1 ring-blue-100";
  }

  return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
}

function getUnitStatusLabel(status: Unit["status"]): string {
  if (status === "occupied") {
    return "Occupée";
  }

  if (status === "vacant") {
    return "Vacante";
  }

  return "Inactive";
}

function formatOptionalNumber(value: number | null, suffix?: string): string {
  if (value === null) {
    return "Non renseigné";
  }

  return suffix ? `${value.toLocaleString("fr-FR")} ${suffix}` : value.toLocaleString("fr-FR");
}

function HomeIcon({ className = "h-4 w-4" }: IconProps): ReactElement {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M3 8.5 10 3l7 5.5V17H3V8.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8 17v-4h4v4" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function MoneyIcon({ className = "h-4 w-4" }: IconProps): ReactElement {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="5" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6 8.5h.01M14 11.5h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function BedIcon({ className = "h-4 w-4" }: IconProps): ReactElement {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M3 14V8.5A1.5 1.5 0 0 1 4.5 7H7a2 2 0 0 1 2 2v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9 10h4.5A2.5 2.5 0 0 1 16 12.5V14H3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M3 16v-2M16 16v-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function BathIcon({ className = "h-4 w-4" }: IconProps): ReactElement {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M5 10V7.8A2.8 2.8 0 0 1 7.8 5H9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M4 10h12v1.5A3.5 3.5 0 0 1 12.5 15h-5A3.5 3.5 0 0 1 4 11.5V10Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M6.5 4.5h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function RulerIcon({ className = "h-4 w-4" }: IconProps): ReactElement {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M5 14.5 14.5 5 17 7.5 7.5 17H5v-2.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M11 7.5 12.5 9M8.5 10 10 11.5M6 12.5 7.5 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function MapPinIcon({ className = "h-4 w-4" }: IconProps): ReactElement {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M10 17s5-4.7 5-9a5 5 0 1 0-10 0c0 4.3 5 9 5 9Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="10" cy="8" r="1.8" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function UserIcon({ className = "h-4 w-4" }: IconProps): ReactElement {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4.5 16a5.5 5.5 0 0 1 11 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function CalendarIcon({ className = "h-4 w-4" }: IconProps): ReactElement {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="4.5" width="14" height="12.5" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 8h14M7 3v3M13 3v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function LayersIcon({ className = "h-4 w-4" }: IconProps): ReactElement {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="m10 4 6 3-6 3-6-3 6-3ZM4 10l6 3 6-3M4 13l6 3 6-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SparklesIcon({ className = "h-4 w-4" }: IconProps): ReactElement {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M10 3 11.5 8.5 17 10l-5.5 1.5L10 17l-1.5-5.5L3 10l5.5-1.5L10 3ZM4 4l.5 1.5L6 6l-1.5.5L4 8l-.5-1.5L2 6l1.5-.5L4 4ZM16 13l.5 1.5L18 15l-1.5.5L16 17l-.5-1.5L14 15l1.5-.5L16 13Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function ImagePlaceholderIcon({ className = "h-10 w-10" }: IconProps): ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="m7 15 3-3 3 3 2-2 2 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="9" r="1.2" fill="currentColor" />
    </svg>
  );
}

export default function UnitDetailPage({ params }: PageProps): ReactElement {
  const router = useRouter();
  const { id } = use(params);

  const [unit, setUnit] = useState<Unit | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [formData, setFormData] = useState<UnitFormData>({
    propertyId: "",
    unitNumber: "",
    monthlyRentAmount: 0,
    currencyCode: "CDF",
    status: "vacant"
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchUnit(): Promise<void> {
      try {
        const unitResponse = await fetch(`/api/units/${id}`, { credentials: "include" });

        if (!unitResponse.ok) {
          setError("Unité introuvable");
          setLoading(false);
          return;
        }

        const unitData = await unitResponse.json() as { success: boolean; data?: Unit };
        if (unitData.success && unitData.data) {
          setUnit(unitData.data);
          setFormData({
            propertyId: unitData.data.propertyId,
            unitNumber: unitData.data.unitNumber,
            monthlyRentAmount: unitData.data.monthlyRentAmount,
            currencyCode: unitData.data.currencyCode,
            status: unitData.data.status
          });

          const propertyResponse = await fetch(`/api/properties/${unitData.data.propertyId}`, { credentials: "include" });
          if (propertyResponse.ok) {
            const propertyData = await propertyResponse.json() as { success: boolean; data?: Property };
            if (propertyData.success && propertyData.data) {
              setProperty(propertyData.data);
            }
          }
        }

        setLoading(false);
      } catch {
        setError("Erreur lors du chargement de l'unité");
        setLoading(false);
      }
    }

    void fetchUnit();
  }, [id]);

  async function handleSave(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const result = await patchWithAuth<Unit>(`/api/units/${id}`, formData);

    if (!result.success) {
      setError(result.error);
      setSaving(false);
      return;
    }

    setUnit(result.data);
    setEditMode(false);
    setSaving(false);
  }

  async function handleDelete(): Promise<void> {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette unité ? Cette action est irréversible.")) {
      return;
    }

    setDeleting(true);
    setError(null);

    const result = await deleteWithAuth(`/api/units/${id}`);

    if (!result.success) {
      setError(result.error);
      setDeleting(false);
      return;
    }

    router.push(`/dashboard/properties/${unit?.propertyId}`);
  }

  if (loading) {
    return (
      <div className="p-8">
        <UniversalLoadingState />
      </div>
    );
  }

  if (error && !unit) {
    return (
      <div className="p-8">
        <p className="text-red-600">{error}</p>
        <Link href="/dashboard/properties" className="text-[#0063fe] hover:underline">
          Retour au portfolio
        </Link>
      </div>
    );
  }

  if (!unit) {
    return (
      <div className="p-8">
        <p className="text-gray-600">Unité introuvable</p>
      </div>
    );
  }

  const locationLabel = property
    ? `${property.address}, ${property.city}${property.countryCode ? `, ${property.countryCode}` : ""}`
    : "Chargement de l'adresse...";
  const ownerLabel = property?.ownerName ?? "Non renseigné";
  const managementLabel = property?.managementContext === "managed" ? "Bien géré pour un propriétaire" : "Bien détenu par l'organisation";
  const propertyTypeLabel = property?.propertyType === "multi_unit" ? "Multi-unités" : property?.propertyType === "single_unit" ? "Simple" : "Non renseigné";
  const propertyImageUrl = property?.photoUrls[0] ?? null;

  return (
    <div className="space-y-6 p-8">
      <div>
        <Link href={`/dashboard/properties/${unit.propertyId}`} className="mb-4 inline-block text-sm text-[#0063fe] hover:underline">
          ← Retour à la propriété
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {!editMode ? (
          <div className="px-6 py-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="h-28 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 sm:w-44">
                    {propertyImageUrl ? (
                      <img src={propertyImageUrl} alt={property?.name ?? `Unité ${unit.unitNumber}`} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-400">
                        <ImagePlaceholderIcon className="h-12 w-12" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#010a19]">Unité {unit.unitNumber}</h1>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getUnitStatusClassName(unit.status)}`}>
                        {getUnitStatusLabel(unit.status)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                      <span className="inline-flex items-center gap-2"><HomeIcon className="h-4 w-4" />{property?.name ?? `Propriété ${unit.propertyId.slice(-6)}`}</span>
                      <span className="inline-flex items-center gap-2"><MapPinIcon className="h-4 w-4" />{locationLabel}</span>
                      <span className="inline-flex items-center gap-2"><UserIcon className="h-4 w-4" />{ownerLabel}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <ActionMenu
                  items={[
                    { label: "Ajouter un document", onSelect: () => setDocumentModalOpen(true) },
                    { label: "Modifier l’unité", onSelect: () => setEditMode(true) },
                    {
                      label: deleting ? "Suppression..." : "Supprimer l’unité",
                      onSelect: () => {
                        void handleDelete();
                      },
                      tone: "danger",
                      disabled: deleting
                    }
                  ]}
                />
              </div>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-5">
              <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] text-slate-500"><LayersIcon className="h-4 w-4" />Résumé</h2>
              <div className="mt-3 grid gap-x-6 gap-y-4 md:grid-cols-3 xl:grid-cols-6">
                <div>
                  <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.08em] text-slate-500"><MoneyIcon className="h-3.5 w-3.5" />Loyer</p>
                  <p className="mt-1 text-sm font-semibold text-[#010a19]">{formatCurrencyAmount(unit.monthlyRentAmount, unit.currencyCode)}</p>
                </div>
                <div>
                  <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.08em] text-slate-500"><MoneyIcon className="h-3.5 w-3.5" />Dépôt</p>
                  <p className="mt-1 text-sm font-semibold text-[#010a19]">{formatCurrencyAmount(unit.depositAmount, unit.currencyCode)}</p>
                </div>
                <div>
                  <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.08em] text-slate-500"><BedIcon className="h-3.5 w-3.5" />Chambres</p>
                  <p className="mt-1 text-sm font-semibold text-[#010a19]">{formatOptionalNumber(unit.bedroomCount)}</p>
                </div>
                <div>
                  <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.08em] text-slate-500"><BathIcon className="h-3.5 w-3.5" />Salles de bain</p>
                  <p className="mt-1 text-sm font-semibold text-[#010a19]">{formatOptionalNumber(unit.bathroomCount)}</p>
                </div>
                <div>
                  <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.08em] text-slate-500"><RulerIcon className="h-3.5 w-3.5" />Surface</p>
                  <p className="mt-1 text-sm font-semibold text-[#010a19]">{formatOptionalNumber(unit.sizeSqm, "m²")}</p>
                </div>
                <div>
                  <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.08em] text-slate-500"><CalendarIcon className="h-3.5 w-3.5" />Créée le</p>
                  <p className="mt-1 text-sm font-semibold text-[#010a19]">{new Date(unit.createdAtIso).toLocaleDateString("fr-FR")}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 border-slate-200 pt-5">
              <dl className="mt-3 divide-y divide-slate-200 border-y border-slate-200">
                <div className="grid gap-2 px-1 py-3 md:grid-cols-[220px_minmax(0,1fr)]">
                  <dt className="text-sm text-slate-500">Bien</dt>
                  <dd className="text-sm font-medium text-[#010a19]">{property?.name ?? `#${unit.propertyId.slice(-6)}`}</dd>
                </div>
                <div className="grid gap-2 px-1 py-3 md:grid-cols-[220px_minmax(0,1fr)]">
                  <dt className="text-sm text-slate-500">Type de bien</dt>
                  <dd className="text-sm font-medium text-[#010a19]">{propertyTypeLabel}</dd>
                </div>
                <div className="grid gap-2 px-1 py-3 md:grid-cols-[220px_minmax(0,1fr)]">
                  <dt className="text-sm text-slate-500">Localisation</dt>
                  <dd className="text-sm font-medium text-[#010a19]">{locationLabel}</dd>
                </div>
                <div className="grid gap-2 px-1 py-3 md:grid-cols-[220px_minmax(0,1fr)]">
                  <dt className="text-sm text-slate-500">Propriétaire</dt>
                  <dd className="text-sm font-medium text-[#010a19]">{ownerLabel}</dd>
                </div>
                <div className="grid gap-2 px-1 py-3 md:grid-cols-[220px_minmax(0,1fr)]">
                  <dt className="text-sm text-slate-500">Contexte</dt>
                  <dd className="text-sm font-medium text-[#010a19]">{managementLabel}</dd>
                </div>
              </dl>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-5">
              <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] text-slate-500"><LayersIcon className="h-4 w-4" />Caractéristiques</h2>
              <dl className="mt-3 divide-y divide-slate-200 border-y border-slate-200">
                <div className="grid gap-2 px-1 py-3 md:grid-cols-[220px_minmax(0,1fr)]">
                  <dt className="text-sm text-slate-500">Numéro d'unité</dt>
                  <dd className="text-sm font-medium text-[#010a19]">{unit.unitNumber}</dd>
                </div>
                <div className="grid gap-2 px-1 py-3 md:grid-cols-[220px_minmax(0,1fr)]">
                  <dt className="text-sm text-slate-500">Statut</dt>
                  <dd className="text-sm font-medium text-[#010a19]">{getUnitStatusLabel(unit.status)}</dd>
                </div>
                <div className="grid gap-2 px-1 py-3 md:grid-cols-[220px_minmax(0,1fr)]">
                  <dt className="text-sm text-slate-500">Devise</dt>
                  <dd className="text-sm font-medium text-[#010a19]">{unit.currencyCode}</dd>
                </div>
              </dl>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-5">
              <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] text-slate-500"><HomeIcon className="h-4 w-4" />Équipements</h2>
              <div className="mt-3 min-h-8 text-sm text-[#010a19]">
                {unit.amenities.length > 0 ? (
                  <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {unit.amenities.map((amenity) => (
                      <li key={amenity} className="flex items-center gap-2 py-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                        <span>{amenity}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-500">Aucun équipement renseigné.</p>
                )}
              </div>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-5">
              <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] text-slate-500"><SparklesIcon className="h-4 w-4" />Atouts et notes</h2>
              <div className="mt-3 min-h-8 text-sm text-[#010a19]">
                {unit.features.length > 0 ? (
                  <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {unit.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 py-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#0063fe]" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-500">Aucun atout supplémentaire renseigné.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4 px-6 py-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Numéro d'unité</label>
              <input
                type="text"
                required
                value={formData.unitNumber}
                onChange={(event) => setFormData((previous) => ({ ...previous, unitNumber: event.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-[#010a19] outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Loyer mensuel</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.monthlyRentAmount}
                onChange={(event) => setFormData((previous) => ({ ...previous, monthlyRentAmount: Number(event.target.value) }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-[#010a19] outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Devise</label>
              <select
                value={formData.currencyCode}
                onChange={(event) => setFormData((previous) => ({ ...previous, currencyCode: event.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-[#010a19] outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/20"
              >
                <option value="CDF">CDF (Franc Congolais)</option>
                <option value="USD">USD (Dollar Américain)</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Statut</label>
              <select
                value={formData.status}
                onChange={(event) =>
                  setFormData((previous) => ({
                    ...previous,
                    status: event.target.value as "vacant" | "occupied" | "inactive"
                  }))
                }
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-[#010a19] outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/20"
              >
                <option value="vacant">Vacante</option>
                <option value="occupied">Occupée</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {error ? (
              <p className="rounded-lg border border-red-100 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
                {error}
              </p>
            ) : null}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0052d4] disabled:opacity-60"
              >
                {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditMode(false);
                  setFormData({
                    propertyId: unit.propertyId,
                    unitNumber: unit.unitNumber,
                    monthlyRentAmount: unit.monthlyRentAmount,
                    currencyCode: unit.currencyCode,
                    status: unit.status
                  });
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
            </div>
          </form>
        )}
      </div>

      <ContextualDocumentPanel
        attachmentType="unit"
        attachmentId={id}
        title="Documents de l'unité"
        description="Centralisez ici les plans, états des lieux, contrats techniques et tout document propre à cette unité."
        addButtonLabel="Ajouter un document"
        showAddButton={false}
      />

      {documentModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#010a19]/55 p-4"
          onClick={() => setDocumentModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Ajouter un document à l'unité"
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-[#010a19]">Ajouter un document</h2>
                <p className="mt-1 text-sm text-slate-500">Importez un document et rattachez-le directement à cette unité.</p>
              </div>
              <button
                type="button"
                onClick={() => setDocumentModalOpen(false)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Fermer
              </button>
            </div>

            <div className="p-6">
              <ContextualDocumentPanel
                attachmentType="unit"
                attachmentId={id}
                title="Documents de l'unité"
                description="Ajoutez un plan, un état des lieux, un contrat technique ou toute pièce utile à cette unité."
                addButtonLabel="Ajouter un document"
                showUploadFormOnMount={true}
                containerClassName="mt-0 rounded-2xl border border-slate-200"
                showAddButton={false}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
