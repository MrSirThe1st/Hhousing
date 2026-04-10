"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Tenant } from "@hhousing/domain";
import { patchWithAuth, deleteWithAuth } from "../../../../lib/api-client";

const ContextualDocumentPanel = dynamic(
  () => import("../../../../components/contextual-document-panel"),
  { ssr: false }
);

type TenantFormData = {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  photoUrl: string;
};

interface TenantDetailClientProps {
  id: string;
  initialTenant: Tenant;
}

export default function TenantDetailClient({ id, initialTenant }: TenantDetailClientProps): React.ReactElement {
  const router = useRouter();
  const [tenant, setTenant] = useState<Tenant>(initialTenant);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<TenantFormData>({
    fullName: initialTenant.fullName,
    email: initialTenant.email ?? "",
    phone: initialTenant.phone ?? "",
    dateOfBirth: initialTenant.dateOfBirth ?? "",
    photoUrl: initialTenant.photoUrl ?? ""
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const result = await patchWithAuth<Tenant>(`/api/tenants/${id}`, {
      fullName: formData.fullName.trim(),
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
      dateOfBirth: formData.dateOfBirth || null,
      photoUrl: formData.photoUrl.trim() || null
    });

    if (!result.success) {
      setError(result.error);
      setSaving(false);
      return;
    }

    setTenant(result.data);
    setEditMode(false);
    setSaving(false);
  }

  async function handleDelete(): Promise<void> {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce locataire ? Cette action est irréversible.")) {
      return;
    }

    setDeleting(true);
    setError(null);

    const result = await deleteWithAuth(`/api/tenants/${id}`);

    if (!result.success) {
      setError(result.error);
      setDeleting(false);
      return;
    }

    router.push("/dashboard/tenants");
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/dashboard/tenants" className="text-sm text-[#0063fe] hover:underline mb-4 inline-block">
          ← Retour aux locataires
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        {!editMode ? (
          <>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-4">
                {tenant.photoUrl ? (
                  <img src={tenant.photoUrl} alt={tenant.fullName} className="h-20 w-20 rounded-2xl object-cover" />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-100 text-2xl text-gray-500">
                    {tenant.fullName.substring(0, 1).toUpperCase()}
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-semibold text-[#010a19]">{tenant.fullName}</h1>
                  <p className="text-gray-600 mt-1">{tenant.email ?? "Aucun e-mail"}</p>
                  <p className="text-gray-600">{tenant.phone ?? "Aucun téléphone"}</p>
                  <p className="text-gray-600">{tenant.dateOfBirth ? `Né le ${tenant.dateOfBirth}` : "Date de naissance non renseignée"}</p>
                  <p className="text-sm text-gray-500 mt-2">Ajouté le {new Date(tenant.createdAtIso).toLocaleDateString("fr-FR")}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditMode(true)} className="rounded-lg border border-[#0063fe] px-4 py-2 text-sm font-semibold text-[#0063fe] hover:bg-[#0063fe]/5">Modifier</button>
                <button onClick={handleDelete} disabled={deleting} className="rounded-lg border border-red-600 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60">{deleting ? "Suppression..." : "Supprimer"}</button>
              </div>
            </div>
          </>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Nom complet</label><input type="text" required value={formData.fullName} onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-[#010a19] outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/20" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label><input type="email" value={formData.email} onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-[#010a19] outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/20" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Téléphone</label><input type="tel" value={formData.phone} onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-[#010a19] outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/20" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Date de naissance</label><input type="date" value={formData.dateOfBirth} onChange={(e) => setFormData((prev) => ({ ...prev, dateOfBirth: e.target.value }))} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-[#010a19] outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/20" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Photo (URL)</label><input type="url" value={formData.photoUrl} onChange={(e) => setFormData((prev) => ({ ...prev, photoUrl: e.target.value }))} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-[#010a19] outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/20" /></div>
            {error ? <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">{error}</p> : null}
            <div className="flex gap-2"><button type="submit" disabled={saving} className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0052d4] disabled:opacity-60">{saving ? "Enregistrement..." : "Enregistrer"}</button><button type="button" onClick={() => { setEditMode(false); setFormData({ fullName: tenant.fullName, email: tenant.email ?? "", phone: tenant.phone ?? "", dateOfBirth: tenant.dateOfBirth ?? "", photoUrl: tenant.photoUrl ?? "" }); }} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Annuler</button></div>
          </form>
        )}
      </div>

      <ContextualDocumentPanel attachmentType="tenant" attachmentId={id} />
    </div>
  );
}
