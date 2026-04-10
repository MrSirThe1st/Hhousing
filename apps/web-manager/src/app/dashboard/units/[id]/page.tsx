"use client";

import { use, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ReactElement, FormEvent } from "react";
import type { Lease, Tenant, Unit } from "@hhousing/domain";
import { deleteWithAuth, patchWithAuth, postWithAuth } from "../../../../lib/api-client";
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

function PlusIcon(): ReactElement {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

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

export default function UnitDetailPage({ params }: PageProps): ReactElement {
  const router = useRouter();
  const { id } = use(params);

  const [unit, setUnit] = useState<Unit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<UnitFormData>({
    propertyId: "",
    unitNumber: "",
    monthlyRentAmount: 0,
    currencyCode: "CDF",
    status: "vacant"
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantIdToAssign, setTenantIdToAssign] = useState("");
  const [leaseStartDate, setLeaseStartDate] = useState(new Date().toISOString().substring(0, 10));
  const [leaseEndDate, setLeaseEndDate] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignMessage, setAssignMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUnitAndTenants(): Promise<void> {
      try {
        const [unitResponse, tenantsResponse] = await Promise.all([
          fetch(`/api/units/${id}`, { credentials: "include" }),
          fetch("/api/tenants", { credentials: "include" })
        ]);

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
        }

        if (tenantsResponse.ok) {
          const tenantsData = await tenantsResponse.json() as {
            success: boolean;
            data?: { tenants: Tenant[] };
          };

          if (tenantsData.success) {
            const tenantItems = tenantsData.data?.tenants ?? [];
            setTenants(tenantItems);
            if (tenantItems[0]) {
              setTenantIdToAssign((current) => current || tenantItems[0].id);
            }
          }
        }

        setLoading(false);
      } catch {
        setError("Erreur lors du chargement de l'unité");
        setLoading(false);
      }
    }

    void fetchUnitAndTenants();
  }, [id]);

  async function handleAssignTenant(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!unit || tenantIdToAssign.trim().length === 0) {
      setError("Sélectionnez un locataire pour continuer.");
      return;
    }

    setAssigning(true);
    setError(null);
    setAssignMessage(null);

    const createLeaseResult = await postWithAuth<Lease>("/api/leases", {
      organizationId: unit.organizationId,
      unitId: unit.id,
      tenantId: tenantIdToAssign,
      startDate: leaseStartDate,
      endDate: leaseEndDate.trim() || null,
      monthlyRentAmount: unit.monthlyRentAmount,
      currencyCode: unit.currencyCode
    });

    if (!createLeaseResult.success) {
      setError(createLeaseResult.error);
      setAssigning(false);
      return;
    }

    setUnit((previous) => {
      if (!previous) {
        return previous;
      }

      return {
        ...previous,
        status: "occupied"
      };
    });
    setFormData((previous) => ({
      ...previous,
      status: "occupied"
    }));
    setAssignMessage("Locataire assigné et bail créé avec succès.");
    setAssigning(false);
  }

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

  return (
    <div className="space-y-6 p-8">
      <div>
        <Link href={`/dashboard/properties/${unit.propertyId}`} className="mb-4 inline-block text-sm text-[#0063fe] hover:underline">
          ← Retour à la propriété
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {!editMode ? (
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#010a19]">Unité {unit.unitNumber}</h1>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getUnitStatusClassName(unit.status)}`}>
                    {getUnitStatusLabel(unit.status)}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-500">
                  <span className="rounded-full bg-slate-50 px-3 py-1 ring-1 ring-slate-200">{formatCurrencyAmount(unit.monthlyRentAmount, unit.currencyCode)}/mois</span>
                  <span className="rounded-full bg-slate-50 px-3 py-1 ring-1 ring-slate-200">Propriété #{unit.propertyId.slice(-6)}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {unit.status === "vacant" ? (
                  <button
                    type="button"
                    onClick={() => {
                      const formElement = document.getElementById("assign-tenant-form");
                      formElement?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#0063fe] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0052d4]"
                  >
                    <PlusIcon />
                    Assigner un locataire
                  </button>
                ) : null}
                <ActionMenu
                  items={[
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

            {unit.status === "vacant" ? (
              <form id="assign-tenant-form" onSubmit={handleAssignTenant} className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <h2 className="text-sm font-semibold text-[#010a19]">Assigner un locataire</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Crée un bail actif pour cette unité vacante et bascule automatiquement l’unité en occupée.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <select
                    value={tenantIdToAssign}
                    onChange={(event) => setTenantIdToAssign(event.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                    required
                    disabled={assigning || tenants.length === 0}
                  >
                    {tenants.length === 0 ? <option value="">Aucun locataire disponible</option> : null}
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.fullName}
                      </option>
                    ))}
                  </select>

                  <input
                    type="date"
                    value={leaseStartDate}
                    onChange={(event) => setLeaseStartDate(event.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                    required
                    disabled={assigning}
                  />

                  <input
                    type="date"
                    value={leaseEndDate}
                    onChange={(event) => setLeaseEndDate(event.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                    disabled={assigning}
                  />
                </div>

                {assignMessage ? (
                  <p className="rounded-lg border border-green-100 bg-green-50 px-3.5 py-2.5 text-sm text-green-700">
                    {assignMessage}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={assigning || tenants.length === 0}
                  className="rounded-lg bg-[#0063fe] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0052d4] disabled:opacity-60"
                >
                  {assigning ? "Assignation..." : "Assigner et créer le bail"}
                </button>
              </form>
            ) : null}
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

      <ContextualDocumentPanel attachmentType="unit" attachmentId={id} />
    </div>
  );
}
