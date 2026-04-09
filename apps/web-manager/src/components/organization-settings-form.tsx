"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UpdateOrganizationOutput } from "@hhousing/api-contracts";
import type { Organization } from "@hhousing/domain";
import { patchWithAuth } from "../lib/api-client";
import { createSupabaseBrowserClient } from "../lib/supabase/browser";

interface OrganizationSettingsFormProps {
  organization: Organization;
}

interface OrganizationFormState {
  name: string;
  logoUrl: string;
  contactEmail: string;
  contactPhone: string;
  contactWhatsapp: string;
  websiteUrl: string;
  address: string;
  emailSignature: string;
}

function buildInitialState(organization: Organization): OrganizationFormState {
  return {
    name: organization.name,
    logoUrl: organization.logoUrl ?? "",
    contactEmail: organization.contactEmail ?? "",
    contactPhone: organization.contactPhone ?? "",
    contactWhatsapp: organization.contactWhatsapp ?? "",
    websiteUrl: organization.websiteUrl ?? "",
    address: organization.address ?? "",
    emailSignature: organization.emailSignature ?? ""
  };
}

export default function OrganizationSettingsForm({ organization }: OrganizationSettingsFormProps): React.ReactElement {
  const router = useRouter();
  const [form, setForm] = useState<OrganizationFormState>(() => buildInitialState(organization));
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function uploadLogo(file: File): Promise<string> {
    if (!file.type.startsWith("image/")) {
      throw new Error("Le logo doit etre une image.");
    }

    const supabase = createSupabaseBrowserClient();
    const safeName = file.name.replace(/\s+/g, "-");
    const filePath = `${organization.id}/branding/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, file);

    if (uploadError) {
      if (uploadError.message.toLowerCase().includes("row-level security policy")) {
        throw new Error("Upload bloque par Supabase Storage RLS. Ajoutez une policy INSERT pour le bucket 'documents' (role authenticated).");
      }

      throw new Error(uploadError.message);
    }

    const { data: { publicUrl } } = supabase.storage.from("documents").getPublicUrl(filePath);
    return publicUrl;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      const logoUrl = logoFile ? await uploadLogo(logoFile) : form.logoUrl.trim();

      const result = await patchWithAuth<UpdateOrganizationOutput>("/api/organization", {
        name: form.name,
        logoUrl,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone,
        contactWhatsapp: form.contactWhatsapp,
        websiteUrl: form.websiteUrl,
        address: form.address,
        emailSignature: form.emailSignature
      });

      if (!result.success) {
        setError(result.error);
        setBusy(false);
        return;
      }

      setForm(buildInitialState(result.data.organization));
      setLogoFile(null);
      setMessage("Organisation mise a jour.");
      setBusy(false);
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Erreur de telechargement du logo.");
      setBusy(false);
    }
  }

  const logoPreview = logoFile ? URL.createObjectURL(logoFile) : form.logoUrl;

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4 h-fit">
        <div>
          <h2 className="text-base font-semibold text-[#010a19]">Logo</h2>
          <p className="mt-1 text-sm text-gray-500">Affiche dans votre espace gestion et dans les emails cibles de cette fonctionnalite.</p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
          {logoPreview ? (
            <img src={logoPreview} alt="Logo organisation" className="h-40 w-full object-contain bg-white" />
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-gray-400">Aucun logo ajoute</div>
          )}
        </div>
        <input
          type="file"
          accept="image/*"
          onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[#010a19]">Details de l'organisation</h2>
          <p className="mt-1 text-sm text-gray-500">Ces informations restent optionnelles et pourront etre reinjectees dans les templates et invitations locataires.</p>
        </div>

        {message ? <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div> : null}
        {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-gray-700">
            <span className="mb-1.5 block">Nom</span>
            <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            <span className="mb-1.5 block">Email de contact</span>
            <input type="email" value={form.contactEmail} onChange={(event) => setForm((current) => ({ ...current, contactEmail: event.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            <span className="mb-1.5 block">Telephone</span>
            <input value={form.contactPhone} onChange={(event) => setForm((current) => ({ ...current, contactPhone: event.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            <span className="mb-1.5 block">WhatsApp</span>
            <input value={form.contactWhatsapp} onChange={(event) => setForm((current) => ({ ...current, contactWhatsapp: event.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </label>
          <label className="block text-sm font-medium text-gray-700 md:col-span-2">
            <span className="mb-1.5 block">Site web</span>
            <input value={form.websiteUrl} onChange={(event) => setForm((current) => ({ ...current, websiteUrl: event.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="https://..." />
          </label>
          <label className="block text-sm font-medium text-gray-700 md:col-span-2">
            <span className="mb-1.5 block">Adresse</span>
            <textarea value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} className="min-h-24 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </label>
          <label className="block text-sm font-medium text-gray-700 md:col-span-2">
            <span className="mb-1.5 block">Signature email</span>
            <textarea value={form.emailSignature} onChange={(event) => setForm((current) => ({ ...current, emailSignature: event.target.value }))} className="min-h-32 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Ex: L'equipe Gestion Horizon\ncontact@...\n+243 ..." />
          </label>
        </div>

        <button type="submit" disabled={busy} className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white hover:bg-[#0050d0] disabled:opacity-60">
          {busy ? "Enregistrement..." : "Enregistrer"}
        </button>
      </section>
    </form>
  );
}
