"use client";

import { useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/auth-context";
import { createSupabaseBrowserClient } from "../lib/supabase/browser";
import LogoutButton from "./logout-button";
import UniversalLoadingState from "./universal-loading-state";
import ProvinceSelect from "./province-select";

import type { Organization } from "@hhousing/domain";
import type { UpdateOrganizationOutput } from "@hhousing/api-contracts";
import { patchWithAuth, postWithAuth } from "../lib/api-client";

interface OperatorProfilePanelProps {
  role: "landlord" | "property_manager" | "platform_admin";
  organization: Organization | null;
  canEditOrganization: boolean;
}

export interface OrgFormState {
  name: string;
  logoUrl: string;
  contactEmail: string;
  contactPhone: string;
  contactWhatsapp: string;
  websiteUrl: string;
  address: string;
  emailSignature: string;
  registrationNumber: string;
  vatNumber: string;
  capital: string;
  country: string;
  city: string;
  state: string;
  zipCode: string;
}

export function resolveOrgInitialState(organization: Organization | null): OrgFormState {
  return {
    name: organization?.name ?? "",
    logoUrl: organization?.logoUrl ?? "",
    contactEmail: organization?.contactEmail ?? "",
    contactPhone: organization?.contactPhone ?? "",
    contactWhatsapp: organization?.contactWhatsapp ?? "",
    websiteUrl: organization?.websiteUrl ?? "",
    address: organization?.address ?? "",
    emailSignature: organization?.emailSignature ?? "",
    registrationNumber: organization?.registrationNumber ?? "",
    vatNumber: organization?.vatNumber ?? "",
    capital: organization?.capital ?? "",
    country: organization?.country || "République Démocratique du Congo",
    city: organization?.city ?? "",
    state: organization?.state ?? "",
    zipCode: organization?.zipCode ?? ""
  };
}

type ProfileFormState = {
  fullName: string;
  email: string;
  avatarUrl: string;
};

function resolveInitialState(user: ReturnType<typeof useAuth>["user"]): ProfileFormState {
  if (!user) {
    return {
      fullName: "",
      email: "",
      avatarUrl: ""
    };
  }

  const metadata = user.user_metadata;
  const fullName = (() => {
    if (metadata && typeof metadata === "object") {
      const value = "full_name" in metadata ? metadata.full_name : undefined;
      if (typeof value === "string") {
        return value;
      }
    }
    return "";
  })();

  const avatarUrl = (() => {
    if (metadata && typeof metadata === "object") {
      const value = "avatar_url" in metadata ? metadata.avatar_url : undefined;
      if (typeof value === "string") {
        return value;
      }
    }
    return "";
  })();

  return {
    fullName,
    email: user.email ?? "",
    avatarUrl
  };
}

function getInitials(value: string): string {
  const parts = value
    .split(" ")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 2);

  if (parts.length === 0) {
    return "OP";
  }

  return parts.map((item) => item[0]?.toUpperCase() ?? "").join("");
}

function getRoleLabel(role: "landlord" | "property_manager" | "platform_admin"): string {
  if (role === "landlord") {
    return "Propriétaire";
  }
  if (role === "property_manager") {
    return "Gestionnaire";
  }
  return "Administrateur plateforme";
}

export default function OperatorProfilePanel({ role, organization, canEditOrganization }: OperatorProfilePanelProps): React.ReactElement {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [form, setForm] = useState<ProfileFormState>(() => resolveInitialState(user));
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [checklistDismissed, setChecklistDismissed] = useState(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("hhousing.profile_checklist.dismissed") === "true";
    }
    return false;
  });

  const handleDismissChecklist = () => {
    setChecklistDismissed(true);
    window.localStorage.setItem("hhousing.profile_checklist.dismissed", "true");
  };

  const avatarPreview = useMemo(() => {
    if (avatarFile) {
      return URL.createObjectURL(avatarFile);
    }
    return form.avatarUrl;
  }, [avatarFile, form.avatarUrl]);

  const checklist = useMemo(() => {
    const items = [
      { label: "Nom complet renseigné", done: form.fullName.trim().length > 0 },
      { label: "Photo de profil définie", done: form.avatarUrl.trim().length > 0 || !!avatarFile },
      { label: "Adresse email valide", done: form.email.trim().length > 0 }
    ];

    if (role !== "platform_admin") {
      items.push(
        { label: "Nom de l'organisation", done: !!organization?.name },
        { label: "Logo de l'organisation", done: !!organization?.logoUrl },
        { label: "Email de contact", done: !!organization?.contactEmail },
        { label: "Téléphone ou WhatsApp", done: !!organization?.contactPhone || !!organization?.contactWhatsapp },
        { label: "Site web de l'organisation", done: !!organization?.websiteUrl },
        { label: "Informations légales (SIRET/TVA)", done: !!organization?.registrationNumber || !!organization?.vatNumber },
        { label: "Adresse & Localisation", done: !!organization?.address && !!organization?.city && !!organization?.country },
        { label: "Signature email configurée", done: !!organization?.emailSignature }
      );
    }

    return items;
  }, [form.fullName, form.avatarUrl, avatarFile, form.email, role, organization]);

  const completionPercent = useMemo(() => {
    const completedCount = checklist.filter((item) => item.done).length;
    return Math.round((completedCount / checklist.length) * 100);
  }, [checklist]);

  async function uploadAvatar(file: File): Promise<string> {
    if (!user) {
      throw new Error("Session introuvable.");
    }

    if (!file.type.startsWith("image/")) {
      throw new Error("La photo doit être une image.");
    }

    const supabase = createSupabaseBrowserClient();
    const safeName = file.name.replace(/\s+/g, "-");
    const filePath = `users/${user.id}/avatar/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, file);
    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage.from("documents").getPublicUrl(filePath);
    return data.publicUrl;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!user) {
      setError("Session introuvable.");
      return;
    }

    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const nextAvatarUrl = avatarFile ? await uploadAvatar(avatarFile) : form.avatarUrl.trim();

      const updates: {
        email?: string;
        data: {
          full_name: string;
          avatar_url: string;
        };
      } = {
        data: {
          full_name: form.fullName.trim(),
          avatar_url: nextAvatarUrl
        }
      };

      if (form.email.trim() && form.email.trim() !== (user.email ?? "")) {
        updates.email = form.email.trim();
      }

      const { error: updateError } = await supabase.auth.updateUser(updates);
      if (updateError) {
        setError(updateError.message);
        setBusy(false);
        return;
      }

      setForm((current) => ({
        ...current,
        avatarUrl: nextAvatarUrl
      }));
      setAvatarFile(null);
      setMessage(updates.email ? "Profil mis à jour. Veuillez vérifier votre boîte email pour confirmer la nouvelle adresse." : "Votre profil a été enregistré avec succès.");
      setBusy(false);
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Mise à jour impossible.");
      setBusy(false);
    }
  }

  // Organization settings states
  const [orgForm, setOrgForm] = useState<OrgFormState>(() => resolveOrgInitialState(organization));
  const [orgLogoFile, setOrgLogoFile] = useState<File | null>(null);
  const [orgBusy, setOrgBusy] = useState(false);
  const [orgMessage, setOrgMessage] = useState<string | null>(null);
  const [orgError, setOrgError] = useState<string | null>(null);
  const orgLogoInputRef = useRef<HTMLInputElement>(null);

  const orgLogoPreview = useMemo(() => {
    if (orgLogoFile) {
      return URL.createObjectURL(orgLogoFile);
    }
    return orgForm.logoUrl;
  }, [orgLogoFile, orgForm.logoUrl]);

  async function uploadOrgLogo(file: File): Promise<string> {
    if (!file.type.startsWith("image/")) {
      throw new Error("Le logo doit être une image.");
    }

    const supabase = createSupabaseBrowserClient();
    const safeName = file.name.replace(/\s+/g, "-");
    const filePath = `${organization?.id || "unknown"}/branding/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, file);

    if (uploadError) {
      if (uploadError.message.toLowerCase().includes("row-level security policy")) {
        throw new Error("Téléchargement bloqué par Supabase Storage RLS. Veuillez ajouter une policy INSERT pour le bucket 'documents'.");
      }
      throw new Error(uploadError.message);
    }

    const { data: { publicUrl } } = supabase.storage.from("documents").getPublicUrl(filePath);
    return publicUrl;
  }

  async function handleOrgSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!canEditOrganization) {
      return;
    }
    setOrgBusy(true);
    setOrgMessage(null);
    setOrgError(null);

    try {
      const logoUrl = orgLogoFile ? await uploadOrgLogo(orgLogoFile) : orgForm.logoUrl.trim();

      const result = await patchWithAuth<UpdateOrganizationOutput>("/api/organization", {
        name: orgForm.name,
        logoUrl,
        contactEmail: orgForm.contactEmail,
        contactPhone: orgForm.contactPhone,
        contactWhatsapp: orgForm.contactWhatsapp,
        websiteUrl: orgForm.websiteUrl,
        address: orgForm.address,
        emailSignature: orgForm.emailSignature,
        registrationNumber: orgForm.registrationNumber,
        vatNumber: orgForm.vatNumber,
        capital: orgForm.capital,
        country: orgForm.country,
        city: orgForm.city,
        state: orgForm.state,
        zipCode: orgForm.zipCode
      });

      if (!result.success) {
        setOrgError(result.error);
        setOrgBusy(false);
        return;
      }

      setOrgForm(resolveOrgInitialState(result.data.organization));
      setOrgLogoFile(null);
      setOrgMessage("Organisation mise à jour avec succès.");
      setOrgBusy(false);
      router.refresh();
    } catch (caughtError) {
      setOrgError(caughtError instanceof Error ? caughtError.message : "Erreur de mise à jour.");
      setOrgBusy(false);
    }
  }

  // Deletion state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDeleteAccount(): Promise<void> {
    if (deleteConfirmText !== "SUPPRIMER") {
      return;
    }

    setDeleteBusy(true);
    setDeleteError(null);

    try {
      const result = await postWithAuth<{ success: boolean; error?: string }>("/api/profile/delete", {});

      if (!result.success) {
        setDeleteError(result.error || "Impossible de supprimer votre compte.");
        setDeleteBusy(false);
        return;
      }

      await signOut();
      window.location.href = "/login";
    } catch (caughtError) {
      setDeleteError(caughtError instanceof Error ? caughtError.message : "Erreur inattendue.");
      setDeleteBusy(false);
    }
  }

  const handleCopyId = () => {
    if (!user) return;
    navigator.clipboard.writeText(user.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const triggerOrgLogoInput = () => {
    if (orgLogoInputRef.current) {
      orgLogoInputRef.current.click();
    }
  };

  if (!user) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Session introuvable. Veuillez vous reconnecter.
      </div>
    );
  }

  const authProvider = user.app_metadata?.provider ?? "email";
  const accountCreatedAt = user.created_at
    ? new Date(user.created_at).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" })
    : "-";

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Title Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Mon profil</h1>
          <p className="mt-1 text-sm text-slate-500">Gerez vos informations de connexion et personnalisez votre compte operateur.</p>
        </div>
        <div className="shrink-0">
          <LogoutButton />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* Left column: Summary Card & Checklist */}
        <div className="space-y-6">
          {/* Main User Card */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
            {/* Banner Cover */}
            <div className="relative h-28 w-full bg-gradient-to-r from-blue-500 to-[#0063fe]">
              <svg className="absolute inset-0 h-full w-full opacity-20" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid-pattern" width="16" height="16" patternUnits="userSpaceOnUse">
                    <path d="M 16 0 L 0 0 0 16" fill="none" stroke="white" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid-pattern)" />
              </svg>
            </div>

            {/* Profile Info */}
            <div className="relative px-6 pb-6 text-center">
              {/* Avatar Uploader Wrapper */}
              <div className="relative mx-auto -mt-14 h-28 w-28 rounded-full border-4 border-white bg-slate-100 shadow-md">
                <div className="group relative h-full w-full overflow-hidden rounded-full">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Photo de profil" className="h-full w-full object-cover bg-white" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-[#0063fe] text-3xl font-semibold text-white">
                      {getInitials(form.fullName || user.email || "")}
                    </div>
                  )}

                  {/* Hover Edit Action Overlay */}
                  <button
                    type="button"
                    onClick={triggerFileInput}
                    disabled={busy}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 transition-opacity duration-200 group-hover:opacity-100 cursor-pointer focus:outline-none disabled:cursor-not-allowed"
                    title="Changer la photo"
                  >
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="mt-1 text-[11px] font-semibold text-white uppercase tracking-wider">Modifier</span>
                  </button>
                </div>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                disabled={busy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) setAvatarFile(file);
                }}
                className="hidden"
              />

              {/* Text Fields */}
              <h2 className="mt-4 truncate text-lg font-bold text-slate-900">{form.fullName || "Operateur Haraka"}</h2>
              <p className="truncate text-sm text-slate-500">{form.email}</p>

              {/* Badges */}
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-[#0063fe] ring-1 ring-inset ring-blue-700/10">
                  {getRoleLabel(role)}
                </span>
                {organization?.name ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-600/10">
                    {organization.name}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Profile Completion Checklist */}
          {!checklistDismissed && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm relative">
              {completionPercent === 100 && (
                <button
                  type="button"
                  onClick={handleDismissChecklist}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
                  title="Fermer"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              <h3 className="text-sm font-bold text-slate-900">Statut du compte</h3>
              
              {/* Meter Bar */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-500">Profil complete</span>
                  <span className="text-[#0063fe]">{completionPercent}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-[#0063fe] transition-all duration-500 ease-out"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
              </div>

              {/* Checklist elements */}
              <ul className="mt-5 space-y-3">
                {checklist.map((item, index) => (
                  <li key={index} className="flex items-center gap-3 text-xs text-slate-600">
                    {item.done ? (
                      <svg className="h-5 w-5 text-emerald-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l3-3z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <circle cx="12" cy="12" r="9" strokeWidth="2" />
                      </svg>
                    )}
                    <span className={item.done ? "line-through text-slate-400 font-medium" : "font-medium"}>
                      {item.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right column: Form Fields and technical metrics */}
        <div className="space-y-6">
          {/* Main profile form */}
          <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Informations personnelles</h3>

            <div className="mt-5 space-y-5">
              {/* Alert notices */}
              {message ? (
                <div className="flex gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800">
                  <svg className="h-5 w-5 text-emerald-600 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l3-3z" clipRule="evenodd" />
                  </svg>
                  <span>{message}</span>
                </div>
              ) : null}

              {error ? (
                <div className="flex gap-2.5 rounded-lg border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-800">
                  <svg className="h-5 w-5 text-red-600 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              ) : null}

              {/* Input: full name */}
              <div className="space-y-1.5">
                <label htmlFor="full-name" className="text-xs font-semibold text-slate-700">
                  Nom complet
                </label>
                <input
                  id="full-name"
                  type="text"
                  value={form.fullName}
                  onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                  disabled={busy}
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#0063fe] focus:ring-4 focus:ring-[#0063fe]/10 disabled:bg-slate-50 disabled:text-slate-400"
                  placeholder="Ex. Jean Dupont"
                />
              </div>

              {/* Input: email address */}
              <div className="space-y-1.5">
                <label htmlFor="email-address" className="text-xs font-semibold text-slate-700">
                  Adresse email
                </label>
                <input
                  id="email-address"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  disabled={busy}
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#0063fe] focus:ring-4 focus:ring-[#0063fe]/10 disabled:bg-slate-50 disabled:text-slate-400"
                  placeholder="nom@exemple.com"
                />
                <p className="text-[11px] text-slate-400">Si vous changez d&apos;adresse email, un email de confirmation vous sera envoye.</p>
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-6 border-t border-slate-100 pt-4 flex justify-end">
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0063fe] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0052d4] focus:outline-none focus:ring-4 focus:ring-blue-500/25 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {busy ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-1.5 h-4.5 w-4.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Enregistrement...</span>
                  </>
                ) : (
                  <span>Enregistrer les modifications</span>
                )}
              </button>
            </div>
          </form>

          {/* Organization settings card */}
          {organization && (
            <form onSubmit={handleOrgSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Détails de l'organisation</h3>
                <p className="mt-1 text-xs text-slate-500">Informations complémentaires de votre agence ou entité.</p>
              </div>

              {orgMessage ? (
                <div className="flex gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800">
                  <svg className="h-5 w-5 text-emerald-600 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l3-3z" clipRule="evenodd" />
                  </svg>
                  <span>{orgMessage}</span>
                </div>
              ) : null}

              {orgError ? (
                <div className="flex gap-2.5 rounded-lg border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-800">
                  <svg className="h-5 w-5 text-red-600 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>{orgError}</span>
                </div>
              ) : null}

              {!canEditOrganization ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                  Seul le créateur initial de l'organisation peut modifier ces informations.
                </div>
              ) : null}

              <div className="grid gap-6 md:grid-cols-[200px_minmax(0,1fr)] items-start">
                {/* Logo uploader */}
                <div className="space-y-3">
                  <span className="text-xs font-semibold text-slate-700 block">Logo</span>
                  <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 group aspect-video flex items-center justify-center">
                    {orgLogoPreview ? (
                      <img src={orgLogoPreview} alt="Logo" className="h-full w-full object-contain bg-white p-2" />
                    ) : (
                      <span className="text-xs text-slate-400">Aucun logo</span>
                    )}

                    {canEditOrganization && (
                      <button
                        type="button"
                        onClick={triggerOrgLogoInput}
                        disabled={orgBusy}
                        className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 transition-opacity duration-200 group-hover:opacity-100 cursor-pointer focus:outline-none disabled:cursor-not-allowed"
                      >
                        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        </svg>
                        <span className="mt-1 text-[10px] font-semibold text-white uppercase tracking-wider">Modifier</span>
                      </button>
                    )}
                  </div>
                  <input
                    ref={orgLogoInputRef}
                    type="file"
                    accept="image/*"
                    disabled={orgBusy || !canEditOrganization}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) setOrgLogoFile(file);
                    }}
                    className="hidden"
                  />
                </div>

                {/* Main organization fields */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label htmlFor="org-name" className="text-xs font-semibold text-slate-700">Nom de l'organisation</label>
                    <input
                      id="org-name"
                      type="text"
                      value={orgForm.name}
                      onChange={(e) => setOrgForm((curr) => ({ ...curr, name: e.target.value }))}
                      disabled={orgBusy || !canEditOrganization}
                      className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-800 outline-none transition focus:border-[#0063fe] focus:ring-4 focus:ring-[#0063fe]/10 disabled:bg-slate-50 disabled:text-slate-400"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="org-email" className="text-xs font-semibold text-slate-700">Email de contact</label>
                    <input
                      id="org-email"
                      type="email"
                      value={orgForm.contactEmail}
                      onChange={(e) => setOrgForm((curr) => ({ ...curr, contactEmail: e.target.value }))}
                      disabled={orgBusy || !canEditOrganization}
                      className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-800 outline-none transition focus:border-[#0063fe] focus:ring-4 focus:ring-[#0063fe]/10 disabled:bg-slate-50 disabled:text-slate-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="org-phone" className="text-xs font-semibold text-slate-700">Téléphone</label>
                    <input
                      id="org-phone"
                      type="text"
                      value={orgForm.contactPhone}
                      onChange={(e) => setOrgForm((curr) => ({ ...curr, contactPhone: e.target.value }))}
                      disabled={orgBusy || !canEditOrganization}
                      className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-800 outline-none transition focus:border-[#0063fe] focus:ring-4 focus:ring-[#0063fe]/10 disabled:bg-slate-50 disabled:text-slate-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="org-whatsapp" className="text-xs font-semibold text-slate-700">WhatsApp</label>
                    <input
                      id="org-whatsapp"
                      type="text"
                      value={orgForm.contactWhatsapp}
                      onChange={(e) => setOrgForm((curr) => ({ ...curr, contactWhatsapp: e.target.value }))}
                      disabled={orgBusy || !canEditOrganization}
                      className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-800 outline-none transition focus:border-[#0063fe] focus:ring-4 focus:ring-[#0063fe]/10 disabled:bg-slate-50 disabled:text-slate-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="org-website" className="text-xs font-semibold text-slate-700">Site web</label>
                    <input
                      id="org-website"
                      type="text"
                      value={orgForm.websiteUrl}
                      onChange={(e) => setOrgForm((curr) => ({ ...curr, websiteUrl: e.target.value }))}
                      disabled={orgBusy || !canEditOrganization}
                      className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-800 outline-none transition focus:border-[#0063fe] focus:ring-4 focus:ring-[#0063fe]/10 disabled:bg-slate-50 disabled:text-slate-400"
                      placeholder="https://..."
                    />
                  </div>

                  {/* Corporate and Facturation details */}
                  <div className="sm:col-span-2 border-t border-slate-100 pt-4 mt-2">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Informations légales &amp; Facturation</h4>
                    <p className="text-[11px] text-slate-500">Ces données figureront sur vos baux, factures et reçus.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="org-reg-num" className="text-xs font-semibold text-slate-700">SIRET / Immatriculation</label>
                    <input
                      id="org-reg-num"
                      type="text"
                      value={orgForm.registrationNumber}
                      onChange={(e) => setOrgForm((curr) => ({ ...curr, registrationNumber: e.target.value }))}
                      disabled={orgBusy || !canEditOrganization}
                      className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-800 outline-none transition focus:border-[#0063fe] focus:ring-4 focus:ring-[#0063fe]/10 disabled:bg-slate-50 disabled:text-slate-400"
                      placeholder="Ex: RCS Paris B 123 456 789"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="org-vat" className="text-xs font-semibold text-slate-700">Numéro de TVA</label>
                    <input
                      id="org-vat"
                      type="text"
                      value={orgForm.vatNumber}
                      onChange={(e) => setOrgForm((curr) => ({ ...curr, vatNumber: e.target.value }))}
                      disabled={orgBusy || !canEditOrganization}
                      className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-800 outline-none transition focus:border-[#0063fe] focus:ring-4 focus:ring-[#0063fe]/10 disabled:bg-slate-50 disabled:text-slate-400"
                      placeholder="Ex: FR 12 345678901"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="org-capital" className="text-xs font-semibold text-slate-700">Capital social</label>
                    <input
                      id="org-capital"
                      type="text"
                      value={orgForm.capital}
                      onChange={(e) => setOrgForm((curr) => ({ ...curr, capital: e.target.value }))}
                      disabled={orgBusy || !canEditOrganization}
                      className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-800 outline-none transition focus:border-[#0063fe] focus:ring-4 focus:ring-[#0063fe]/10 disabled:bg-slate-50 disabled:text-slate-400"
                      placeholder="Ex: 10 000 EUR"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="org-zip" className="text-xs font-semibold text-slate-700">Code postal</label>
                    <input
                      id="org-zip"
                      type="text"
                      value={orgForm.zipCode}
                      onChange={(e) => setOrgForm((curr) => ({ ...curr, zipCode: e.target.value }))}
                      disabled={orgBusy || !canEditOrganization}
                      className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-800 outline-none transition focus:border-[#0063fe] focus:ring-4 focus:ring-[#0063fe]/10 disabled:bg-slate-50 disabled:text-slate-400"
                      placeholder="Ex: 75001"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="org-city" className="text-xs font-semibold text-slate-700">Ville</label>
                    <input
                      id="org-city"
                      type="text"
                      value={orgForm.city}
                      onChange={(e) => setOrgForm((curr) => ({ ...curr, city: e.target.value }))}
                      disabled={orgBusy || !canEditOrganization}
                      className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-800 outline-none transition focus:border-[#0063fe] focus:ring-4 focus:ring-[#0063fe]/10 disabled:bg-slate-50 disabled:text-slate-400"
                      placeholder="Ex: Paris"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="org-state" className="text-xs font-semibold text-slate-700">Province</label>
                    <ProvinceSelect
                      value={orgForm.state}
                      onChange={(value) => setOrgForm((curr) => ({ ...curr, state: value }))}
                      disabled={orgBusy || !canEditOrganization}
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label htmlFor="org-country" className="text-xs font-semibold text-slate-700">Pays</label>
                    <select
                      id="org-country"
                      value={orgForm.country}
                      onChange={(e) => setOrgForm((curr) => ({ ...curr, country: e.target.value }))}
                      disabled={orgBusy || !canEditOrganization}
                      className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 bg-white outline-none transition focus:border-[#0063fe] focus:ring-4 focus:ring-[#0063fe]/10 disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      <option value="République Démocratique du Congo">République Démocratique du Congo</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label htmlFor="org-address" className="text-xs font-semibold text-slate-700">Adresse physique</label>
                    <textarea
                      id="org-address"
                      value={orgForm.address}
                      onChange={(e) => setOrgForm((curr) => ({ ...curr, address: e.target.value }))}
                      disabled={orgBusy || !canEditOrganization}
                      rows={3}
                      className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-800 outline-none transition focus:border-[#0063fe] focus:ring-4 focus:ring-[#0063fe]/10 disabled:bg-slate-50 disabled:text-slate-400"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label htmlFor="org-signature" className="text-xs font-semibold text-slate-700">Signature email</label>
                    <textarea
                      id="org-signature"
                      value={orgForm.emailSignature}
                      onChange={(e) => setOrgForm((curr) => ({ ...curr, emailSignature: e.target.value }))}
                      disabled={orgBusy || !canEditOrganization}
                      rows={4}
                      className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-800 outline-none transition focus:border-[#0063fe] focus:ring-4 focus:ring-[#0063fe]/10 disabled:bg-slate-50 disabled:text-slate-400"
                      placeholder="Ex: L'équipe Horizon"
                    />
                  </div>
                </div>
              </div>

              {canEditOrganization && (
                <div className="border-t border-slate-100 pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={orgBusy}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0063fe] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0052d4] focus:outline-none focus:ring-4 focus:ring-blue-500/25 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {orgBusy ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-1.5 h-4.5 w-4.5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Enregistrement...</span>
                      </>
                    ) : (
                      <span>Enregistrer les informations</span>
                    )}
                  </button>
                </div>
              )}
            </form>
          )}



          {/* Zone de danger */}
          <div className="rounded-2xl border border-red-200 bg-red-50/20 p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-red-700">Zone de danger</h3>
              <p className="mt-1 text-xs text-slate-500">
                Action irréversible. Supprimer définitivement votre compte utilisateur et toutes les données associées (propriétés, baux, locataires, factures, etc.).
              </p>
            </div>

            <div className="border-t border-red-100 pt-4 flex justify-start">
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-500/25"
              >
                <svg className="h-4 w-4 stroke-current" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Supprimer mon compte</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900">Suppression définitive</h4>
                <p className="text-xs text-slate-500">Cette action est irréversible et détruira toutes vos données.</p>
              </div>
            </div>

            {deleteError ? (
              <div className="rounded-lg border border-red-200 bg-red-50/80 px-4 py-3 text-xs text-red-800">
                {deleteError}
              </div>
            ) : null}

            <div className="space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed font-normal">
                Veuillez saisir <strong className="text-slate-900 font-bold select-all">SUPPRIMER</strong> ci-dessous pour confirmer que vous souhaitez supprimer votre compte et toutes les données associées.
              </p>

              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Saisissez SUPPRIMER"
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                disabled={deleteBusy}
              />
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                  setDeleteError(null);
                }}
                disabled={deleteBusy}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteBusy || deleteConfirmText !== "SUPPRIMER"}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteBusy ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Suppression...</span>
                  </>
                ) : (
                  <span>Confirmer la suppression</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteBusy ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#010a19]/35 backdrop-blur-[1px]">
          <UniversalLoadingState minHeightClassName="min-h-0" className="h-full w-full" />
        </div>
      ) : null}
    </div>
  );
}
