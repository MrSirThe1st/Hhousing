"use client";

import { use, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Lease, Tenant, Unit } from "@hhousing/domain";
import { deleteWithAuth, patchWithAuth, postWithAuth } from "../../../../lib/api-client";

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

export default function UnitDetailPage({ params }: PageProps): React.ReactElement {
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
          fetch(`/api/units/${id}`, {
            credentials: "include"
          }),
          fetch("/api/tenants", {
            credentials: "include"
          })
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

    fetchUnitAndTenants();
  }, [id]);

  async function handleAssignTenant(event: React.FormEvent<HTMLFormElement>): Promise<void> {
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
      if (!previous) return previous;
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

  async function handleSave(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
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
        <p className="text-gray-600">Chargement...</p>
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
    <div className="p-8">
      <div className="mb-6">
        <Link href={`/dashboard/properties/${unit.propertyId}`} className="text-sm text-[#0063fe] hover:underline mb-4 inline-block">
          ← Retour à la propriété
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        {!editMode ? (
          <>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-semibold text-[#010a19]">Unité {unit.unitNumber}</h1>
                <p className="text-gray-600">{unit.monthlyRentAmount.toLocaleString()} {unit.currencyCode}/mois</p>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold mt-2 ${
                  unit.status === "occupied" ? "bg-green-100 text-green-800" :
                  unit.status === "vacant" ? "bg-blue-100 text-blue-800" :
                  "bg-gray-100 text-gray-800"
                }`}>
                  {unit.status === "occupied" ? "Occupée" : unit.status === "vacant" ? "Vacante" : "Inactive"}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditMode(true)}
                  className="rounded-lg border border-[#0063fe] px-4 py-2 text-sm font-semibold text-[#0063fe] hover:bg-[#0063fe]/5"
                >
                  Modifier
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-lg border border-red-600 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  {deleting ? "Suppression..." : "Supprimer"}
                </button>
              </div>
            </div>

            {unit.status === "vacant" ? (
              <form onSubmit={handleAssignTenant} className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
                <h2 className="text-sm font-semibold text-[#010a19]">Assigner un locataire</h2>
                <p className="text-xs text-gray-600">
                  Crée un bail actif pour cette unité vacante et bascule automatiquement l&apos;unité en occupée.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <select
                    value={tenantIdToAssign}
                    onChange={(event) => setTenantIdToAssign(event.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    required
                    disabled={assigning || tenants.length === 0}
                  >
                    {tenants.length === 0 ? (
                      <option value="">Aucun locataire disponible</option>
                    ) : null}
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
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    required
                    disabled={assigning}
                  />

                  <input
                    type="date"
                    value={leaseEndDate}
                    onChange={(event) => setLeaseEndDate(event.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    disabled={assigning}
                  />
                </div>

                {assignMessage ? (
                  <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3.5 py-2.5">
                    {assignMessage}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={assigning || tenants.length === 0}
                  className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0052d4] disabled:opacity-60"
                >
                  {assigning ? "Assignation..." : "Assigner et créer le bail"}
                </button>
              </form>
            ) : null}
          </>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Numéro d'unité</label>
              <input
                type="text"
                required
                value={formData.unitNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, unitNumber: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-[#010a19] outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Loyer mensuel</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.monthlyRentAmount}
                onChange={(e) => setFormData(prev => ({ ...prev, monthlyRentAmount: Number(e.target.value) }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-[#010a19] outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Devise</label>
              <select
                value={formData.currencyCode}
                onChange={(e) => setFormData(prev => ({ ...prev, currencyCode: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-[#010a19] outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/20"
              >
                <option value="CDF">CDF (Franc Congolais)</option>
                <option value="USD">USD (Dollar Américain)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Statut</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as "vacant" | "occupied" | "inactive" }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-[#010a19] outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/20"
              >
                <option value="vacant">Vacante</option>
                <option value="occupied">Occupée</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">
                {error}
              </p>
            )}

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
