"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Tenant } from "@hhousing/domain";
import { createSupabaseBrowserClient } from "../lib/supabase/browser";
import { postWithAuth } from "../lib/api-client";
import type { TenantFormState } from "./tenant-management.types";

const INITIAL_TENANT_FORM: TenantFormState = {
  fullName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  photoUrl: ""
};

interface TenantCreateFormProps {
  organizationId: string;
}

export default function TenantCreateForm({ organizationId }: TenantCreateFormProps): React.ReactElement {
  const router = useRouter();
  const [tenantForm, setTenantForm] = useState<TenantFormState>(INITIAL_TENANT_FORM);
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadPhoto(): Promise<string | null> {
    if (!photo) {
      return tenantForm.photoUrl.trim() || null;
    }

    const supabase = createSupabaseBrowserClient();
    const filePath = `${organizationId}/tenant-photos/${Date.now()}-${photo.name}`;
    const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, photo);

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
  }

  async function handleCreateTenant(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(null);

    let photoUrl: string | null = null;

    try {
      photoUrl = await uploadPhoto();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Erreur de téléchargement de la photo.");
      setBusy(false);
      return;
    }

    const result = await postWithAuth<Tenant>("/api/tenants", {
      organizationId,
      fullName: tenantForm.fullName.trim(),
      email: tenantForm.email.trim() || null,
      phone: tenantForm.phone.trim() || null,
      dateOfBirth: tenantForm.dateOfBirth || null,
      photoUrl
    });

    if (!result.success) {
      setError(result.error);
      setBusy(false);
      return;
    }

    router.push(`/dashboard/tenants/${result.data.id}`);
    router.refresh();
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/dashboard/tenants" className="mb-4 inline-block text-sm text-[#0063fe] hover:underline">
          ← Retour aux locataires
        </Link>
        <h1 className="text-2xl font-semibold text-[#010a19]">Ajouter un locataire</h1>
      </div>

      <form onSubmit={handleCreateTenant} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4 lg:max-w-3xl">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            value={tenantForm.fullName}
            onChange={(event) => setTenantForm((previous) => ({ ...previous, fullName: event.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Nom complet"
            required
          />
          <input
            type="date"
            value={tenantForm.dateOfBirth}
            onChange={(event) => setTenantForm((previous) => ({ ...previous, dateOfBirth: event.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="email"
            value={tenantForm.email}
            onChange={(event) => setTenantForm((previous) => ({ ...previous, email: event.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="E-mail"
          />
          <input
            value={tenantForm.phone}
            onChange={(event) => setTenantForm((previous) => ({ ...previous, phone: event.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Téléphone"
          />
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            value={tenantForm.photoUrl}
            onChange={(event) => setTenantForm((previous) => ({ ...previous, photoUrl: event.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Ou coller une URL de photo"
          />
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white hover:bg-[#0050d0] disabled:opacity-60"
        >
          {busy ? "Création..." : "Créer le locataire"}
        </button>
      </form>
    </div>
  );
}