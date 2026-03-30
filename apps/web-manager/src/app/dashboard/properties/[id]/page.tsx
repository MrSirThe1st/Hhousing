"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Property, Unit } from "@hhousing/domain";
import { patchWithAuth, deleteWithAuth } from "../../../../lib/api-client";

type PageProps = {
  params: Promise<{ id: string }>;
};

type PropertyFormData = {
  name: string;
  address: string;
  city: string;
  countryCode: string;
};

export default function PropertyDetailPage({ params }: PageProps): React.ReactElement {
  const router = useRouter();
  const { id } = use(params);

  const [property, setProperty] = useState<Property | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<PropertyFormData>({
    name: "",
    address: "",
    city: "",
    countryCode: "CD"
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchProperty(): Promise<void> {
      try {
        const response = await fetch(`/api/properties/${id}`, {
          credentials: "include"
        });

        if (!response.ok) {
          setError("Propriété introuvable");
          setLoading(false);
          return;
        }

        const data = await response.json() as { success: boolean; data?: Property };
        if (data.success && data.data) {
          setProperty(data.data);
          setFormData({
            name: data.data.name,
            address: data.data.address,
            city: data.data.city,
            countryCode: data.data.countryCode
          });
        }

        // Fetch all properties with units to get units for this property
        const propsResponse = await fetch(`/api/properties/with-units?organizationId=${data.data?.organizationId}`, {
          credentials: "include"
        });

        if (propsResponse.ok) {
          const propsData = await propsResponse.json() as { success: boolean; data?: { items: Array<{ property: Property; units: Unit[] }> } };
          if (propsData.success && propsData.data) {
            const propertyWithUnits = propsData.data.items.find(p => p.property.id === id);
            if (propertyWithUnits) {
              setUnits(propertyWithUnits.units);
            }
          }
        }

        setLoading(false);
      } catch {
        setError("Erreur lors du chargement de la propriété");
        setLoading(false);
      }
    }

    fetchProperty();
  }, [id]);

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

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-gray-600">Chargement...</p>
      </div>
    );
  }

  if (error && !property) {
    return (
      <div className="p-8">
        <p className="text-red-600">{error}</p>
        <Link href="/dashboard/properties" className="text-[#0063fe] hover:underline">
          Retour aux propriétés
        </Link>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="p-8">
        <p className="text-gray-600">Propriété introuvable</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/dashboard/properties" className="text-sm text-[#0063fe] hover:underline mb-4 inline-block">
          ← Retour aux propriétés
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
        {!editMode ? (
          <>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-semibold text-[#010a19]">{property.name}</h1>
                <p className="text-gray-600">{property.address}, {property.city}</p>
                <p className="text-sm text-gray-500">{property.countryCode}</p>
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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom de la propriété</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-[#010a19] outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Adresse</label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-[#010a19] outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Ville</label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-[#010a19] outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/20"
              />
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
                    name: property.name,
                    address: property.address,
                    city: property.city,
                    countryCode: property.countryCode
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

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-[#010a19] mb-4">Unités ({units.length})</h2>

        {units.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Aucune unité pour cette propriété</p>
        ) : (
          <div className="space-y-3">
            {units.map((unit) => (
              <Link
                key={unit.id}
                href={`/dashboard/units/${unit.id}`}
                className="block rounded-lg border border-gray-200 p-4 hover:border-[#0063fe] hover:bg-[#0063fe]/5 transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-[#010a19]">Unité {unit.unitNumber}</p>
                    <p className="text-sm text-gray-600">
                      {unit.monthlyRentAmount.toLocaleString()} {unit.currencyCode}/mois
                    </p>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                    unit.status === "occupied" ? "bg-green-100 text-green-800" :
                    unit.status === "vacant" ? "bg-blue-100 text-blue-800" :
                    "bg-gray-100 text-gray-800"
                  }`}>
                    {unit.status === "occupied" ? "Occupée" : unit.status === "vacant" ? "Vacante" : "Inactive"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
