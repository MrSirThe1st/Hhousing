"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { FormEvent, ReactElement } from "react";
import type { Tenant } from "@hhousing/domain";
import { patchWithAuth, deleteWithAuth } from "../../../../lib/api-client";
import ActionMenu from "../../../../components/action-menu";

const ContextualDocumentPanel = dynamic(
  () => import("../../../../components/contextual-document-panel"),
  { ssr: false }
);

const ContextualDocumentUploadForm = dynamic(
  () => import("../../../../components/contextual-document-upload-form"),
  { ssr: false }
);

type TenantFormData = {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  photoUrl: string;
  employmentStatus: string;
  jobTitle: string;
  monthlyIncome: string;
  numberOfOccupants: string;
};

interface TenantDetailClientProps {
  id: string;
  initialTenant: Tenant;
}

type IconProps = {
  className?: string;
};

function getTenantInitial(fullName: string): string {
  return fullName.trim().substring(0, 1).toUpperCase() || "?";
}

function formatOptionalDate(dateValue: string | null): string {
  if (!dateValue) {
    return "Non renseignée";
  }

  const parsed = new Date(dateValue);

  if (Number.isNaN(parsed.getTime())) {
    return dateValue;
  }

  return parsed.toLocaleDateString("fr-FR");
}

function getAgeLabel(dateValue: string | null): string {
  if (!dateValue) {
    return "Non renseigné";
  }

  const birthDate = new Date(dateValue);

  if (Number.isNaN(birthDate.getTime())) {
    return "Non renseigné";
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDelta = today.getMonth() - birthDate.getMonth();

  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age >= 0 ? `${age} ans` : "Non renseigné";
}

function MailIcon({ className = "h-4 w-4" }: IconProps): ReactElement {
  return <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true"><path d="M3.5 5.5h13A1.5 1.5 0 0 1 18 7v6a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 2 13V7a1.5 1.5 0 0 1 1.5-1.5Z" stroke="currentColor" strokeWidth="1.6" /><path d="m3 6 7 5 7-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function PhoneIcon({ className = "h-4 w-4" }: IconProps): ReactElement {
  return <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true"><path d="M6.2 3.5h2.1l.7 3-1.5 1.3a11 11 0 0 0 4.7 4.7l1.3-1.5 3 .7v2.1c0 .8-.6 1.4-1.4 1.4h-.8C8.8 15.2 4.8 11.2 4.8 6V5c0-.8.6-1.5 1.4-1.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function CalendarIcon({ className = "h-4 w-4" }: IconProps): ReactElement {
  return <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true"><rect x="3" y="4.5" width="14" height="12.5" rx="2" stroke="currentColor" strokeWidth="1.6" /><path d="M3 8h14M7 3v3M13 3v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>;
}

function UserIcon({ className = "h-4 w-4" }: IconProps): ReactElement {
  return <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true"><circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.6" /><path d="M4.5 16a5.5 5.5 0 0 1 11 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>;
}

function LayersIcon({ className = "h-4 w-4" }: IconProps): ReactElement {
  return <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true"><path d="m10 4 6 3-6 3-6-3 6-3ZM4 10l6 3 6-3M4 13l6 3 6-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function CheckCircleIcon({ className = "h-4 w-4" }: IconProps): ReactElement {
  return <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true"><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" /><path d="m7.4 10 1.7 1.7 3.5-3.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export default function TenantDetailClient({ id, initialTenant }: TenantDetailClientProps): React.ReactElement {
  const router = useRouter();
  const [tenant, setTenant] = useState<Tenant>(initialTenant);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [documentRefreshSignal, setDocumentRefreshSignal] = useState(0);
  const [formData, setFormData] = useState<TenantFormData>({
    fullName: initialTenant.fullName,
    email: initialTenant.email ?? "",
    phone: initialTenant.phone ?? "",
    dateOfBirth: initialTenant.dateOfBirth ?? "",
    photoUrl: initialTenant.photoUrl ?? "",
    employmentStatus: initialTenant.employmentStatus ?? "",
    jobTitle: initialTenant.jobTitle ?? "",
    monthlyIncome: initialTenant.monthlyIncome !== null && initialTenant.monthlyIncome !== undefined ? String(initialTenant.monthlyIncome) : "",
    numberOfOccupants: initialTenant.numberOfOccupants !== null && initialTenant.numberOfOccupants !== undefined ? String(initialTenant.numberOfOccupants) : ""
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const profileFieldsCompleted = [
    Boolean(tenant.fullName.trim()),
    Boolean(tenant.email),
    Boolean(tenant.phone),
    Boolean(tenant.dateOfBirth),
    Boolean(tenant.photoUrl),
    Boolean(tenant.employmentStatus),
    Boolean(tenant.jobTitle),
    tenant.monthlyIncome !== null,
    tenant.numberOfOccupants !== null
  ].filter(Boolean).length;
  const profileCompletion = Math.round((profileFieldsCompleted / 9) * 100);
  const hasContact = Boolean(tenant.email || tenant.phone);
  const tenantAge = getAgeLabel(tenant.dateOfBirth);
  const birthDateLabel = formatOptionalDate(tenant.dateOfBirth);
  const createdAtLabel = new Date(tenant.createdAtIso).toLocaleDateString("fr-FR");

  function resetFormData(): void {
    setFormData({
      fullName: tenant.fullName,
      email: tenant.email ?? "",
      phone: tenant.phone ?? "",
      dateOfBirth: tenant.dateOfBirth ?? "",
      photoUrl: tenant.photoUrl ?? "",
      employmentStatus: tenant.employmentStatus ?? "",
      jobTitle: tenant.jobTitle ?? "",
      monthlyIncome: tenant.monthlyIncome !== null && tenant.monthlyIncome !== undefined ? String(tenant.monthlyIncome) : "",
      numberOfOccupants: tenant.numberOfOccupants !== null && tenant.numberOfOccupants !== undefined ? String(tenant.numberOfOccupants) : ""
    });
  }

  async function handleSave(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const result = await patchWithAuth<Tenant>(`/api/tenants/${id}`, {
      fullName: formData.fullName.trim(),
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
      dateOfBirth: formData.dateOfBirth || null,
      photoUrl: formData.photoUrl.trim() || null,
      employmentStatus: formData.employmentStatus.trim() || null,
      jobTitle: formData.jobTitle.trim() || null,
      monthlyIncome: formData.monthlyIncome.trim() ? Number(formData.monthlyIncome) : null,
      numberOfOccupants: formData.numberOfOccupants.trim() ? Number(formData.numberOfOccupants) : null
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
    <div className="space-y-6 p-8">
      <div>
        <Link href="/dashboard/tenants" className="mb-4 inline-block text-sm text-[#0063fe] hover:underline">
          ← Retour aux locataires
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {!editMode ? (
          <div className="px-6 py-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  {tenant.photoUrl ? (
                    <img src={tenant.photoUrl} alt={tenant.fullName} className="h-24 w-24 rounded-2xl border border-slate-200 object-cover" />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-3xl text-slate-500">
                      {getTenantInitial(tenant.fullName)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#010a19]">{tenant.fullName}</h1>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${hasContact ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100" : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"}`}>
                        {hasContact ? "Contactable" : "Contact à compléter"}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                      <span className="inline-flex items-center gap-2"><MailIcon className="h-4 w-4" />{tenant.email ?? "Aucun e-mail"}</span>
                      <span className="inline-flex items-center gap-2"><PhoneIcon className="h-4 w-4" />{tenant.phone ?? "Aucun téléphone"}</span>
                      <span className="inline-flex items-center gap-2"><CalendarIcon className="h-4 w-4" />Ajouté le {createdAtLabel}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <ActionMenu
                  items={[
                    { label: "Modifier le locataire", onSelect: () => setEditMode(true) },
                    {
                      label: deleting ? "Suppression..." : "Supprimer le locataire",
                      onSelect: () => {
                        void handleDelete();
                      },
                      tone: "danger",
                      disabled: deleting
                    }
                  ]}
                />
              </div>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-5">
              <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] text-slate-500"><LayersIcon className="h-4 w-4" />Résumé</h2>
              <div className="mt-3 grid gap-x-6 gap-y-4 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.08em] text-slate-500"><MailIcon className="h-3.5 w-3.5" />E-mail</p>
                  <p className="mt-1 text-sm font-semibold text-[#010a19]">{tenant.email ?? "À renseigner"}</p>
                </div>
                <div>
                  <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.08em] text-slate-500"><PhoneIcon className="h-3.5 w-3.5" />Téléphone</p>
                  <p className="mt-1 text-sm font-semibold text-[#010a19]">{tenant.phone ?? "À renseigner"}</p>
                </div>
                <div>
                  <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.08em] text-slate-500"><UserIcon className="h-3.5 w-3.5" />Âge</p>
                  <p className="mt-1 text-sm font-semibold text-[#010a19]">{tenantAge}</p>
                </div>
                <div>
                  <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.08em] text-slate-500"><CheckCircleIcon className="h-3.5 w-3.5" />Profil complété</p>
                  <p className="mt-1 text-sm font-semibold text-[#010a19]">{profileCompletion}%</p>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-5">
              <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] text-slate-500"><UserIcon className="h-4 w-4" />Informations du locataire</h2>
              <dl className="mt-3 divide-y divide-slate-200 border-y border-slate-200">
                <div className="grid gap-2 px-1 py-3 md:grid-cols-[220px_minmax(0,1fr)]"><dt className="text-sm text-slate-500">Nom complet</dt><dd className="text-sm font-medium text-[#010a19]">{tenant.fullName}</dd></div>
                <div className="grid gap-2 px-1 py-3 md:grid-cols-[220px_minmax(0,1fr)]"><dt className="text-sm text-slate-500">Date de naissance</dt><dd className="text-sm font-medium text-[#010a19]">{birthDateLabel}</dd></div>
                <div className="grid gap-2 px-1 py-3 md:grid-cols-[220px_minmax(0,1fr)]"><dt className="text-sm text-slate-500">Âge estimé</dt><dd className="text-sm font-medium text-[#010a19]">{tenantAge}</dd></div>
                <div className="grid gap-2 px-1 py-3 md:grid-cols-[220px_minmax(0,1fr)]"><dt className="text-sm text-slate-500">Statut professionnel</dt><dd className="text-sm font-medium text-[#010a19]">{tenant.employmentStatus ?? "Non renseigné"}</dd></div>
                <div className="grid gap-2 px-1 py-3 md:grid-cols-[220px_minmax(0,1fr)]"><dt className="text-sm text-slate-500">Poste / Fonction</dt><dd className="text-sm font-medium text-[#010a19]">{tenant.jobTitle ?? "Non renseigné"}</dd></div>
                <div className="grid gap-2 px-1 py-3 md:grid-cols-[220px_minmax(0,1fr)]"><dt className="text-sm text-slate-500">Revenu mensuel</dt><dd className="text-sm font-medium text-[#010a19]">{tenant.monthlyIncome !== null && tenant.monthlyIncome !== undefined ? tenant.monthlyIncome.toLocaleString("fr-FR") : "Non renseigné"}</dd></div>
                <div className="grid gap-2 px-1 py-3 md:grid-cols-[220px_minmax(0,1fr)]"><dt className="text-sm text-slate-500">Nombre d'occupants</dt><dd className="text-sm font-medium text-[#010a19]">{tenant.numberOfOccupants !== null && tenant.numberOfOccupants !== undefined ? tenant.numberOfOccupants : "Non renseigné"}</dd></div>
                <div className="grid gap-2 px-1 py-3 md:grid-cols-[220px_minmax(0,1fr)]"><dt className="text-sm text-slate-500">Créé le</dt><dd className="text-sm font-medium text-[#010a19]">{createdAtLabel}</dd></div>
                <div className="grid gap-2 px-1 py-3 md:grid-cols-[220px_minmax(0,1fr)]"><dt className="text-sm text-slate-500">Identifiant dossier</dt><dd className="text-sm font-medium text-[#010a19]">{tenant.id}</dd></div>
              </dl>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-5">
              <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] text-slate-500"><LayersIcon className="h-4 w-4" />Coordonnées</h2>
              <dl className="mt-3 divide-y divide-slate-200 border-y border-slate-200">
                <div className="grid gap-2 px-1 py-3 md:grid-cols-[220px_minmax(0,1fr)]"><dt className="text-sm text-slate-500">Adresse e-mail</dt><dd className="text-sm font-medium text-[#010a19]">{tenant.email ?? "Aucune adresse e-mail renseignée"}</dd></div>
                <div className="grid gap-2 px-1 py-3 md:grid-cols-[220px_minmax(0,1fr)]"><dt className="text-sm text-slate-500">Téléphone</dt><dd className="text-sm font-medium text-[#010a19]">{tenant.phone ?? "Aucun numéro renseigné"}</dd></div>
                <div className="grid gap-2 px-1 py-3 md:grid-cols-[220px_minmax(0,1fr)]"><dt className="text-sm text-slate-500">Statut contact</dt><dd className="text-sm font-medium text-[#010a19]">{hasContact ? "Canal de contact disponible" : "Compléter l'e-mail ou le téléphone"}</dd></div>
                <div className="grid gap-2 px-1 py-3 md:grid-cols-[220px_minmax(0,1fr)]"><dt className="text-sm text-slate-500">Photo de profil</dt><dd className="text-sm font-medium text-[#010a19]">{tenant.photoUrl ? "Photo renseignée" : "Aucune photo renseignée"}</dd></div>
              </dl>
            </div>

            {error ? <p className="mt-6 rounded-lg border border-red-100 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">{error}</p> : null}
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5 px-6 py-5">
            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#010a19]">Modifier le locataire</h1>
              <p className="mt-1 text-sm text-slate-500">Mettez à jour les coordonnées et les informations de base du dossier locataire.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Nom complet</label><input type="text" required value={formData.fullName} onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-[#010a19] outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/20" /></div>
              <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Date de naissance</label><input type="date" value={formData.dateOfBirth} onChange={(e) => setFormData((prev) => ({ ...prev, dateOfBirth: e.target.value }))} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-[#010a19] outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/20" /></div>
              <div><label className="mb-1.5 block text-sm font-medium text-gray-700">E-mail</label><input type="email" value={formData.email} onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-[#010a19] outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/20" /></div>
              <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Téléphone</label><input type="tel" value={formData.phone} onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-[#010a19] outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/20" /></div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Statut professionnel</label>
                <select value={formData.employmentStatus} onChange={(e) => setFormData((prev) => ({ ...prev, employmentStatus: e.target.value }))} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-[#010a19] outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/20">
                  <option value="">— Sélectionner —</option>
                  <option value="employed">Salarié(e)</option>
                  <option value="self_employed">Indépendant(e)</option>
                  <option value="unemployed">Sans emploi</option>
                  <option value="student">Étudiant(e)</option>
                  <option value="retired">Retraité(e)</option>
                </select>
              </div>
              <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Poste / Intitulé de fonction</label><input type="text" value={formData.jobTitle} onChange={(e) => setFormData((prev) => ({ ...prev, jobTitle: e.target.value }))} placeholder="Ex. Ingénieur, Enseignant…" className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-[#010a19] outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/20" /></div>
              <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Revenu mensuel <span className="font-normal text-gray-400">(optionnel)</span></label><input inputMode="decimal" value={formData.monthlyIncome} onChange={(e) => setFormData((prev) => ({ ...prev, monthlyIncome: e.target.value }))} placeholder="0.00" className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-[#010a19] outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/20" /></div>
              <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Nombre d'occupants</label><input type="number" min="1" value={formData.numberOfOccupants} onChange={(e) => setFormData((prev) => ({ ...prev, numberOfOccupants: e.target.value }))} placeholder="1" className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-[#010a19] outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/20" /></div>
            </div>
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Photo (URL)</label><input type="url" value={formData.photoUrl} onChange={(e) => setFormData((prev) => ({ ...prev, photoUrl: e.target.value }))} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-[#010a19] outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/20" /></div>
            {error ? <p className="rounded-lg border border-red-100 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">{error}</p> : null}
            <div className="flex gap-2"><button type="submit" disabled={saving} className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0052d4] disabled:opacity-60">{saving ? "Enregistrement..." : "Enregistrer"}</button><button type="button" onClick={() => { setEditMode(false); resetFormData(); }} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Annuler</button></div>
          </form>
        )}
      </div>

      <ContextualDocumentPanel
        attachmentType="tenant"
        attachmentId={id}
        title="Documents du locataire"
        description="Centralisez ici les pièces d'identité, formulaires, justificatifs et documents propres à ce locataire."
        addButtonLabel="Ajouter un document"
        showAddButton={true}
        onAddButtonClick={() => setDocumentModalOpen(true)}
        refreshSignal={documentRefreshSignal}
      />

      {documentModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#010a19]/55 p-4"
          onClick={() => setDocumentModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Ajouter un document au locataire"
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-[#010a19]">Ajouter un document</h2>
                <p className="mt-1 text-sm text-slate-500">Importez un document et rattachez-le directement à ce locataire.</p>
              </div>
              <button
                type="button"
                onClick={() => setDocumentModalOpen(false)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Fermer
              </button>
            </div>

            <div className="p-6">
              <ContextualDocumentUploadForm
                attachmentType="tenant"
                attachmentId={id}
                defaultDocumentType="other"
                onUploaded={() => {
                  setDocumentRefreshSignal((current) => current + 1);
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
