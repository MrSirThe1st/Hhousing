"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Tenant } from "@hhousing/domain";
import { createSupabaseBrowserClient } from "../lib/supabase/browser";
import { postWithAuth } from "../lib/api-client";
import type { TenantFormState } from "./tenant-management.types";
import UniversalLoadingState from "./universal-loading-state";

const INITIAL_TENANT_FORM: TenantFormState = {
  fullName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  employmentStatus: "",
  jobTitle: "",
  monthlyIncome: "",
  numberOfOccupants: ""
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
      return null;
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
      photoUrl,
      employmentStatus: tenantForm.employmentStatus.trim() || null,
      jobTitle: tenantForm.jobTitle.trim() || null,
      monthlyIncome: tenantForm.monthlyIncome.trim() ? Number(tenantForm.monthlyIncome) : null,
      numberOfOccupants: tenantForm.numberOfOccupants.trim() ? Number(tenantForm.numberOfOccupants) : null
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
          <label className="block text-sm font-medium text-gray-700">
            <span className="mb-1.5 block">Nom complet</span>
            <input
              value={tenantForm.fullName}
              onChange={(event) => setTenantForm((previous) => ({ ...previous, fullName: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Nom complet"
              required
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            <span className="mb-1.5 block">Date de naissance</span>
            <input
              type="date"
              value={tenantForm.dateOfBirth}
              onChange={(event) => setTenantForm((previous) => ({ ...previous, dateOfBirth: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            <span className="mb-1.5 block">E-mail</span>
            <input
              type="email"
              value={tenantForm.email}
              onChange={(event) => setTenantForm((previous) => ({ ...previous, email: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="nom@exemple.com"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            <span className="mb-1.5 block">Téléphone</span>
            <input
              value={tenantForm.phone}
              onChange={(event) => setTenantForm((previous) => ({ ...previous, phone: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Téléphone"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700 md:col-span-2">
            <span className="mb-1.5 block">Photo du locataire</span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            <span className="mb-1.5 block">Statut professionnel</span>
            <select
              value={tenantForm.employmentStatus}
              onChange={(event) => setTenantForm((previous) => ({ ...previous, employmentStatus: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">— Sélectionner —</option>
              <option value="employed">Salarié(e)</option>
              <option value="self_employed">Indépendant(e)</option>
              <option value="unemployed">Sans emploi</option>
              <option value="student">Étudiant(e)</option>
              <option value="retired">Retraité(e)</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-gray-700">
            <span className="mb-1.5 block">Poste / Intitulé de fonction</span>
            <input
              value={tenantForm.jobTitle}
              onChange={(event) => setTenantForm((previous) => ({ ...previous, jobTitle: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Ex. Ingénieur, Enseignant…"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            <span className="mb-1.5 block">Revenu mensuel <span className="font-normal text-gray-400">(optionnel)</span></span>
            <input
              inputMode="decimal"
              value={tenantForm.monthlyIncome}
              onChange={(event) => setTenantForm((previous) => ({ ...previous, monthlyIncome: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="0.00"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            <span className="mb-1.5 block">Nombre d'occupants</span>
            <input
              type="number"
              min="1"
              value={tenantForm.numberOfOccupants}
              onChange={(event) => setTenantForm((previous) => ({ ...previous, numberOfOccupants: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="1"
            />
          </label>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white hover:bg-[#0050d0] disabled:opacity-60"
        >
          Créer le locataire
        </button>
      </form>

      {busy ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#010a19]/35 backdrop-blur-[1px]">
          <UniversalLoadingState minHeightClassName="min-h-0" className="h-full w-full" />
        </div>
      ) : null}
    </div>
  );
}