"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Unit } from "@hhousing/domain";
import { patchWithAuth, deleteWithAuth } from "../../../../lib/api-client";

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

  useEffect(() => {
    async function fetchUnit(): Promise<void> {
      try {
        const response = await fetch(`/api/units/${id}`, {
          credentials: "include"
        });

        if (!response.ok) {
          setError("Unité introuvable");
          setLoading(false);
          return;
        }

        const data = await response.json() as { success: boolean; data?: Unit };
        if (data.success && data.data) {
          setUnit(data.data);
          setFormData({
            propertyId: data.data.propertyId,
            unitNumber: data.data.unitNumber,
            monthlyRentAmount: data.data.monthlyRentAmount,
            currencyCode: data.data.currencyCode,
            status: data.data.status
          });
        }

        setLoading(false);
      } catch {
        setError("Erreur lors du chargement de l'unité");
        setLoading(false);
      }
    }

    fetchUnit();
  }, [id]);

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
          Retour aux propriétés
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
    </div>
  );
}
