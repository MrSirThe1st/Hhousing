"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CreateOwnerOutput } from "@hhousing/api-contracts";
import { createSupabaseBrowserClient } from "../lib/supabase/browser";
import { postWithAuth } from "../lib/api-client";
import UniversalLoadingState from "./universal-loading-state";

interface OwnerClientCreatePanelProps {
  organizationId: string;
  existingClientCount: number;
}

interface OwnerCreateFormState {
  fullName: string;
  email: string;
  address: string;
  isCompany: boolean;
  companyName: string;
  country: string;
  city: string;
  state: string;
  phoneNumber: string;
}

const INITIAL_FORM_STATE: OwnerCreateFormState = {
  fullName: "",
  email: "",
  address: "",
  isCompany: false,
  companyName: "",
  country: "",
  city: "",
  state: "",
  phoneNumber: ""
};

export default function OwnerClientCreatePanel({
  organizationId,
  existingClientCount
}: OwnerClientCreatePanelProps): React.ReactElement {
  const router = useRouter();
  const [form, setForm] = useState<OwnerCreateFormState>(INITIAL_FORM_STATE);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function uploadProfilePicture(): Promise<string | null> {
    if (!profilePicture) {
      return null;
    }

    const supabase = createSupabaseBrowserClient();
    const filePath = `${organizationId}/owner-photos/${Date.now()}-${profilePicture.name}`;
    const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, profilePicture);

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

  async function handleCreateClient(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const trimmedFullName = form.fullName.trim();
    const trimmedEmail = form.email.trim().toLowerCase();
    const trimmedCompanyName = form.companyName.trim();

    if (trimmedFullName.length === 0) {
      return;
    }

    if (form.isCompany && trimmedCompanyName.length === 0) {
      setError("Le nom de la société est requis quand le profil est une société.");
      return;
    }

    if (trimmedEmail.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Veuillez renseigner une adresse e-mail valide.");
      return;
    }

    setBusy(true);
    setMessage(null);
    setError(null);

    let profilePictureUrl: string | null = null;

    try {
      profilePictureUrl = await uploadProfilePicture();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Erreur de téléchargement de la photo.");
      setBusy(false);
      return;
    }

    const result = await postWithAuth<CreateOwnerOutput>("/api/owner-clients", {
      organizationId,
      fullName: trimmedFullName,
      email: trimmedEmail.length > 0 ? trimmedEmail : null,
      address: form.address.trim() || null,
      isCompany: form.isCompany,
      companyName: form.isCompany ? trimmedCompanyName : null,
      country: form.country.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      phoneNumber: form.phoneNumber.trim() || null,
      profilePictureUrl
    });

    if (!result.success) {
      setError(result.error);
      setBusy(false);
      return;
    }

    setForm(INITIAL_FORM_STATE);
    setProfilePicture(null);
    setBusy(false);
    setMessage(`Owner créé: ${result.data.owner.name}`);
    const inviteQuery = trimmedEmail.length > 0
      ? `?inviteEmail=${encodeURIComponent(trimmedEmail)}`
      : "";
    router.push(`/dashboard/clients/${result.data.owner.id}/assign${inviteQuery}`);
    router.refresh();
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-base font-semibold text-[#010a19]">Ajouter un owner tiers</h2>
        <p className="mt-1 text-sm text-gray-500">
          Enregistrez un profil complet. Vous avez actuellement {existingClientCount} owner(s) tiers.
        </p>
      </div>

      <form onSubmit={handleCreateClient} className="mt-5 space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="block text-sm font-medium text-gray-700 xl:col-span-2">
            <span className="mb-1.5 block">Nom complet</span>
            <input
              value={form.fullName}
              onChange={(event) => setForm((previous) => ({ ...previous, fullName: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Nom du contact ou du propriétaire"
              required
            />
          </label>

          <label className="block text-sm font-medium text-gray-700">
            <span className="mb-1.5 block">E-mail</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((previous) => ({ ...previous, email: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="proprietaire@exemple.com"
            />
          </label>

          <label className="block text-sm font-medium text-gray-700">
            <span className="mb-1.5 block">Photo de profil</span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setProfilePicture(event.target.files?.[0] ?? null)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-[#010a19]">
            <input
              type="checkbox"
              checked={form.isCompany}
              onChange={(event) => setForm((previous) => ({ ...previous, isCompany: event.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-[#0063fe]"
            />
            Société
          </label>

          <label className="block text-sm font-medium text-gray-700 md:col-span-2">
            <span className="mb-1.5 block">Nom de la société</span>
            <input
              value={form.companyName}
              onChange={(event) => setForm((previous) => ({ ...previous, companyName: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Nom légal ou commercial"
              disabled={!form.isCompany}
              required={form.isCompany}
            />
          </label>

          <label className="block text-sm font-medium text-gray-700 xl:col-span-3">
            <span className="mb-1.5 block">Adresse</span>
            <input
              value={form.address}
              onChange={(event) => setForm((previous) => ({ ...previous, address: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Adresse principale"
            />
          </label>

          <label className="block text-sm font-medium text-gray-700">
            <span className="mb-1.5 block">Pays</span>
            <input
              value={form.country}
              onChange={(event) => setForm((previous) => ({ ...previous, country: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Pays"
            />
          </label>

          <label className="block text-sm font-medium text-gray-700">
            <span className="mb-1.5 block">Ville</span>
            <input
              value={form.city}
              onChange={(event) => setForm((previous) => ({ ...previous, city: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Ville"
            />
          </label>

          <label className="block text-sm font-medium text-gray-700">
            <span className="mb-1.5 block">État / Province</span>
            <input
              value={form.state}
              onChange={(event) => setForm((previous) => ({ ...previous, state: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Province ou état"
            />
          </label>

          <label className="block text-sm font-medium text-gray-700 md:col-span-2 xl:col-span-1">
            <span className="mb-1.5 block">Téléphone</span>
            <input
              value={form.phoneNumber}
              onChange={(event) => setForm((previous) => ({ ...previous, phoneNumber: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Téléphone"
            />
          </label>
        </div>

        <p className="text-xs text-gray-500">
          Les documents liés à cet owner pourront être ajoutés juste après la création depuis sa fiche détaillée.
        </p>

        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={busy || form.fullName.trim().length === 0 || (form.isCompany && form.companyName.trim().length === 0)}
            className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white hover:bg-[#0050d0] disabled:opacity-60"
          >
            Ajouter
          </button>
        </div>
      </form>

      {message ? (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {busy ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#010a19]/35 backdrop-blur-[1px]">
          <UniversalLoadingState minHeightClassName="min-h-0" className="h-full w-full" />
        </div>
      ) : null}
    </section>
  );
}