"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UpdateOrganizationOutput } from "@hhousing/api-contracts";
import type { Organization } from "@hhousing/domain";
import { patchWithAuth } from "../lib/api-client";
import { createSupabaseBrowserClient } from "../lib/supabase/browser";

interface OrganizationSettingsFormProps {
  organization: Organization;
  canEdit: boolean;
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

export default function OrganizationSettingsForm({ organization, canEdit }: OrganizationSettingsFormProps): React.ReactElement {
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
    if (!canEdit) {
      return;
    }
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
      <section className="h-fit space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <div>
          <h2 className="text-base font-semibold text-[#010a19]">Logo</h2>
          <p className="mt-1 text-sm text-slate-500">Affiche dans votre espace gestion et dans les emails.</p>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          {logoPreview ? (
            <img src={logoPreview} alt="Logo organisation" className="h-40 w-full bg-white object-contain" />
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-slate-400">Aucun logo ajoute</div>
          )}
        </div>
        <input
          type="file"
          accept="image/*"
          onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
          disabled={!canEdit || busy}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15"
        />
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <div>
          <h2 className="text-base font-semibold text-[#010a19]">Details de l'organisation</h2>
          <p className="mt-1 text-sm text-slate-500">Informations optionnelles reutilisables dans les templates.</p>
        </div>

        {message ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
        {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        {!canEdit ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Seul le createur initial de l'organisation peut modifier ces informations.
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">Nom</span>
            <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} disabled={!canEdit || busy} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15 disabled:bg-slate-100 disabled:text-slate-500" required />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">Email de contact</span>
            <input type="email" value={form.contactEmail} onChange={(event) => setForm((current) => ({ ...current, contactEmail: event.target.value }))} disabled={!canEdit || busy} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15 disabled:bg-slate-100 disabled:text-slate-500" />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">Telephone</span>
            <input value={form.contactPhone} onChange={(event) => setForm((current) => ({ ...current, contactPhone: event.target.value }))} disabled={!canEdit || busy} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15 disabled:bg-slate-100 disabled:text-slate-500" />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">WhatsApp</span>
            <input value={form.contactWhatsapp} onChange={(event) => setForm((current) => ({ ...current, contactWhatsapp: event.target.value }))} disabled={!canEdit || busy} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15 disabled:bg-slate-100 disabled:text-slate-500" />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="mb-1.5 block font-medium text-slate-700">Site web</span>
            <input value={form.websiteUrl} onChange={(event) => setForm((current) => ({ ...current, websiteUrl: event.target.value }))} disabled={!canEdit || busy} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15 disabled:bg-slate-100 disabled:text-slate-500" placeholder="https://..." />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="mb-1.5 block font-medium text-slate-700">Adresse</span>
            <textarea value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} disabled={!canEdit || busy} className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15 disabled:bg-slate-100 disabled:text-slate-500" />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="mb-1.5 block font-medium text-slate-700">Signature email</span>
            <textarea value={form.emailSignature} onChange={(event) => setForm((current) => ({ ...current, emailSignature: event.target.value }))} disabled={!canEdit || busy} className="min-h-32 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15 disabled:bg-slate-100 disabled:text-slate-500" placeholder="Ex: L'equipe Gestion Horizon\ncontact@...\n+243 ..." />
          </label>
        </div>

        <button type="submit" disabled={!canEdit || busy} className="rounded-lg bg-[#0063fe] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0052d4] disabled:opacity-60">
          {busy ? "Enregistrement..." : "Enregistrer"}
        </button>
      </section>
    </form>
  );
}
