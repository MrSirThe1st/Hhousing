"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CreateOwnerOutput } from "@hhousing/api-contracts";
import type { Owner } from "@hhousing/domain";
import { createSupabaseBrowserClient } from "../lib/supabase/browser";
import { patchWithAuth } from "../lib/api-client";

interface OwnerClientEditFormProps {
  organizationId: string;
  client: Owner;
}

interface OwnerEditFormState {
  fullName: string;
  address: string;
  isCompany: boolean;
  companyName: string;
  country: string;
  city: string;
  state: string;
  phoneNumber: string;
}

function getInitialFormState(client: Owner): OwnerEditFormState {
  return {
    fullName: client.fullName,
    address: client.address ?? "",
    isCompany: client.isCompany,
    companyName: client.companyName ?? "",
    country: client.country ?? "",
    city: client.city ?? "",
    state: client.state ?? "",
    phoneNumber: client.phoneNumber ?? ""
  };
}

export default function OwnerClientEditForm({ organizationId, client }: OwnerClientEditFormProps): React.ReactElement {
  const router = useRouter();
  const [form, setForm] = useState<OwnerEditFormState>(getInitialFormState(client));
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadProfilePicture(): Promise<string | null> {
    if (!profilePicture) {
      return client.profilePictureUrl;
    }

    const supabase = createSupabaseBrowserClient();
    const filePath = `${organizationId}/owner-photos/${Date.now()}-${profilePicture.name}`;
    const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, profilePicture);

    if (uploadError) {
      if (uploadError.message.toLowerCase().includes("row-level security policy")) {
        throw new Error(
          "Upload bloque par Supabase Storage RLS. Ajoutez une policy INSERT pour le bucket 'documents' (role authenticated)."
        );
      }

      throw new Error(`Erreur de telechargement: ${uploadError.message}`);
    }

    const {
      data: { publicUrl }
    } = supabase.storage.from("documents").getPublicUrl(filePath);

    return publicUrl;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const trimmedFullName = form.fullName.trim();
    const trimmedCompanyName = form.companyName.trim();

    if (trimmedFullName.length === 0) {
      return;
    }

    if (form.isCompany && trimmedCompanyName.length === 0) {
      setError("Le nom de la societe est requis quand le profil est une societe.");
      return;
    }

    setBusy(true);
    setError(null);

    let profilePictureUrl = client.profilePictureUrl;

    try {
      profilePictureUrl = await uploadProfilePicture();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Erreur de telechargement de la photo.");
      setBusy(false);
      return;
    }

    const result = await patchWithAuth<CreateOwnerOutput>(`/api/owners/${client.id}`, {
      fullName: trimmedFullName,
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

    router.push(`/dashboard/clients/${client.id}`);
    router.refresh();
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-[#010a19]">Modifier le proprietaire</h2>
      <p className="mt-1 text-sm text-gray-500">
        Mettez a jour les informations de ce proprietaire sans quitter son espace.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="block text-sm font-medium text-gray-700 xl:col-span-2">
            <span className="mb-1.5 block">Nom complet</span>
            <input
              value={form.fullName}
              onChange={(event) => setForm((previous) => ({ ...previous, fullName: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Nom du contact ou du proprietaire"
              required
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
            Societe
          </label>

          <label className="block text-sm font-medium text-gray-700 md:col-span-2">
            <span className="mb-1.5 block">Nom de la societe</span>
            <input
              value={form.companyName}
              onChange={(event) => setForm((previous) => ({ ...previous, companyName: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Nom legal ou commercial"
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
            <span className="mb-1.5 block">Etat / Province</span>
            <input
              value={form.state}
              onChange={(event) => setForm((previous) => ({ ...previous, state: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Province ou etat"
            />
          </label>

          <label className="block text-sm font-medium text-gray-700 md:col-span-2 xl:col-span-1">
            <span className="mb-1.5 block">Telephone</span>
            <input
              value={form.phoneNumber}
              onChange={(event) => setForm((previous) => ({ ...previous, phoneNumber: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Telephone"
            />
          </label>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link
            href={`/dashboard/clients/${client.id}`}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={busy || form.fullName.trim().length === 0 || (form.isCompany && form.companyName.trim().length === 0)}
            className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white hover:bg-[#0050d0] disabled:opacity-60"
          >
            {busy ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </form>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
    </section>
  );
}
