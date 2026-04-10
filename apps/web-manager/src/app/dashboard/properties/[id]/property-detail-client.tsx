"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { OwnerClient, Property, Unit } from "@hhousing/domain";
import { patchWithAuth, deleteWithAuth } from "../../../../lib/api-client";
import ActionMenu from "../../../../components/action-menu";

const ContextualDocumentPanel = dynamic(
  () => import("../../../../components/contextual-document-panel"),
  { ssr: false }
);

type PropertyFormData = {
  name: string;
  address: string;
  city: string;
  countryCode: string;
  managementContext: "owned" | "managed";
  clientId: string;
};

interface PropertyDetailClientProps {
  id: string;
  initialProperty: Property;
  initialOwnerClients: OwnerClient[];
  initialUnits: Unit[];
}

function PlusIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function formatCurrencyAmount(amount: number, currencyCode: string): string {
  return `${amount.toLocaleString("fr-FR")} ${currencyCode}`;
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return target.closest("a, button, input, select, textarea, [role='menu']") !== null;
}

export default function PropertyDetailClient({
  id,
  initialProperty,
  initialOwnerClients,
  initialUnits
}: PropertyDetailClientProps): React.ReactElement {
  const router = useRouter();
  const [property, setProperty] = useState<Property>(initialProperty);
  const [ownerClients] = useState<OwnerClient[]>(initialOwnerClients);
  const [units] = useState<Unit[]>(initialUnits);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [formData, setFormData] = useState<PropertyFormData>({
    name: initialProperty.name,
    address: initialProperty.address,
    city: initialProperty.city,
    countryCode: initialProperty.countryCode,
    managementContext: initialProperty.managementContext,
    clientId: initialProperty.clientId ?? ""
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const result = await patchWithAuth<Property>(`/api/properties/${id}`, formData);

    if (!result.success) {
      setError(result.error);
      setSaving(false);
      return;
    }

    setProperty(result.data);
    setEditMode(false);
    setSaving(false);
  }

  async function handleDelete(): Promise<void> {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette propriété ? Cette action est irréversible.")) {
      return;
    }

    setDeleting(true);
    setError(null);

    const result = await deleteWithAuth(`/api/properties/${id}`);

    if (!result.success) {
      setError(result.error);
      setDeleting(false);
      return;
    }

    router.push("/dashboard/properties");
  }

  const totalUnits = units.length;
  const occupiedUnits = units.filter((unit) => unit.status === "occupied").length;
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  const monthlyIncomeByCurrency = units
    .filter((unit) => unit.status === "occupied")
    .reduce((accumulator, unit) => {
      const currency = unit.currencyCode;
      accumulator[currency] = (accumulator[currency] || 0) + unit.monthlyRentAmount;
      return accumulator;
    }, {} as Record<string, number>);

  return (
    <div className="space-y-6 p-8">
      <div>
        <Link href="/dashboard/properties" className="mb-4 inline-block text-sm text-[#0063fe] hover:underline">
          ← Retour au portfolio
        </Link>
      </div>

      <div>
        {!editMode ? (
          <>
            <div className="border-b border-slate-200 px-6 py-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#010a19]">{property.name}</h1>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{property.address}, {property.city}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-500">
                    <span className="rounded-full bg-slate-50 px-3 py-1 ring-1 ring-slate-200">{totalUnits} unités</span>
                    <span className="rounded-full bg-slate-50 px-3 py-1 ring-1 ring-slate-200">{occupancyRate}% d’occupation</span>
                    {property.clientName ? (
                      <span className="rounded-full bg-slate-50 px-3 py-1 ring-1 ring-slate-200">
                        Client:{" "}
                        {property.clientId ? (
                          <Link href={`/dashboard/clients/${property.clientId}`} className="font-medium text-[#0063fe] hover:underline">
                            {property.clientName}
                          </Link>
                        ) : (
                          <span className="font-medium text-[#10213d]">{property.clientName}</span>
                        )}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href="/dashboard/units/add"
                    className="inline-flex items-center gap-2 rounded-lg bg-[#0063fe] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0052d4]"
                  >
                    <PlusIcon />
                    Ajouter une unité
                  </Link>
                  <ActionMenu
                    items={[
                      { label: "Ajouter un document", onSelect: () => setDocumentModalOpen(true) },
                      { label: "Modifier la propriété", onSelect: () => setEditMode(true) },
                      {
                        label: deleting ? "Suppression..." : "Supprimer la propriété",
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
            </div>
          </>
        ) : (
          <form onSubmit={handleSave} className="space-y-4 px-6 py-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom de la propriété</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-[#010a19] outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Adresse</label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-[#010a19] outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Ville</label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-[#010a19] outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Contexte de gestion</label>
              <select
                value={formData.managementContext}
                onChange={(e) => {
                  const nextManagementContext = e.target.value as "owned" | "managed";
                  setFormData((prev) => ({
                    ...prev,
                    managementContext: nextManagementContext,
                    clientId: nextManagementContext === "managed" ? prev.clientId : ""
                  }));
                }}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-[#010a19] outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/20"
              >
                <option value="owned">Mon parc</option>
                <option value="managed">Parc gere</option>
              </select>
            </div>
            {formData.managementContext === "managed" ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Client / proprietaire</label>
                <select
                  value={formData.clientId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, clientId: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-[#010a19] outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/20"
                >
                  <option value="">Aucun client lie</option>
                  {ownerClients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {error ? (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">
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
                    name: property.name,
                    address: property.address,
                    city: property.city,
                    countryCode: property.countryCode,
                    managementContext: property.managementContext,
                    clientId: property.clientId ?? ""
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

      {Object.keys(monthlyIncomeByCurrency).length > 0 ? (
        <div>
          <h2 className="text-md font-semibold text-[#010a19] mb-4">Revenu mensuel</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(monthlyIncomeByCurrency).map(([currency, amount]) => (
              <div key={currency}>
                <p className="text-sm text-slate-500 mb-1">{currency}</p>
                <p className="text-md font-semibold text-[#010a19]">{formatCurrencyAmount(amount, currency)}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-[#010a19]">Unités</h2>
          <span className="rounded-full bg-slate-50 px-3 py-1 text-sm text-slate-500 ring-1 ring-slate-200">{units.length}</span>
        </div>

        {units.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500">Aucune unité pour cette propriété.</div>
        ) : (
          <div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="px-6 py-3 text-left">Unité</th>
                  <th className="px-6 py-3 text-left">Loyer</th>
                  <th className="px-6 py-3 text-left">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {units.map((unit) => (
                  <tr
                    key={unit.id}
                    className="cursor-pointer hover:bg-slate-50/80"
                    tabIndex={0}
                    onClick={(event) => {
                      if (isInteractiveTarget(event.target)) {
                        return;
                      }

                      router.push(`/dashboard/units/${unit.id}`);
                    }}
                    onKeyDown={(event) => {
                      if (isInteractiveTarget(event.target)) {
                        return;
                      }

                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(`/dashboard/units/${unit.id}`);
                      }
                    }}
                  >
                    <td className="px-6 py-4 font-semibold text-[#10213d]">
                      <Link href={`/dashboard/units/${unit.id}`} className="transition hover:text-[#0063fe] hover:underline">
                        Unité {unit.unitNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{formatCurrencyAmount(unit.monthlyRentAmount, unit.currencyCode)}/mois</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                        unit.status === "occupied"
                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                          : unit.status === "vacant"
                            ? "bg-blue-50 text-[#0063fe] ring-1 ring-blue-100"
                            : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                      }`}>
                        {unit.status === "occupied" ? "Occupée" : unit.status === "vacant" ? "Vacante" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {documentModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#010a19]/55 p-4"
          onClick={() => setDocumentModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Ajouter un document à la propriété"
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-[#010a19]">Ajouter un document</h2>
                <p className="mt-1 text-sm text-slate-500">Importez un document et rattachez-le directement à cette propriété.</p>
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
                attachmentType="property"
                attachmentId={id}
                title="Documents de la propriété"
                description="Ajoutez un titre, un contrat, une attestation ou toute pièce utile à cette propriété."
                addButtonLabel="Ajouter un document"
                showUploadFormOnMount={true}
                containerClassName="mt-0 rounded-2xl border border-slate-200"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
