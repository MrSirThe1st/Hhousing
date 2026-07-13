"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PlatformExperience } from "@hhousing/api-contracts";
import PlatformLogoLink from "../../components/platform-logo-link";

type FormData = {
  platformExperience: PlatformExperience | "";
  organizationName: string;
};

const EXPERIENCE_OPTIONS: Array<{
  type: PlatformExperience;
  label: string;
  description: string;
}> = [
  {
    type: "entreprise",
    label: "Entreprise",
    description: "Gestion professionnelle avec tous les outils: équipe, propriétaires mandants, facturation avancée et opérations complètes."
  },
  {
    type: "individual",
    label: "Particulier",
    description: "Gestion simplifiée pour propriétaires qui gèrent leurs propres biens, avec une interface allégée."
  }
];

export default function AccountTypePage(): React.ReactElement {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    platformExperience: "",
    organizationName: ""
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);

    if (!formData.platformExperience) {
      setError("Veuillez sélectionner une expérience");
      return;
    }

    if (!formData.organizationName.trim()) {
      setError("Veuillez entrer un nom d'organisation");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/create-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          platformExperience: formData.platformExperience,
          organizationName: formData.organizationName
        })
      });

      const body = await response.json() as Record<string, unknown>;

      if (!response.ok) {
        const errorMsg = typeof body.error === "string" ? body.error : "Erreur lors de la création du compte";
        setError(errorMsg);
        setLoading(false);
        return;
      }

      router.push(`/onboarding?flow=${encodeURIComponent(formData.platformExperience)}`);
    } catch {
      setError("Erreur réseau. Veuillez réessayer.");
      setLoading(false);
    }
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center bg-white px-4 py-12 relative"
      style={{
        backgroundImage: "url('/brand/MOTIFS.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat"
      }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none bg-slate-50/30" />

      <div className="relative w-full max-w-xl">
        <div className="mb-10 text-center">
          <PlatformLogoLink centered subtitle="Espace gestionnaire" />
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Configurez votre compte</h1>
            <p className="mt-2 text-sm text-slate-600">Choisissez l&apos;expérience qui correspond à votre usage</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <fieldset>
              <legend className="text-sm font-semibold text-slate-700 mb-3">
                Quelle expérience souhaitez-vous ?
              </legend>
              <div className="grid grid-cols-1 gap-3">
                {EXPERIENCE_OPTIONS.map((option) => (
                  <label
                    key={option.type}
                    className="flex items-start rounded-2xl border-2 p-4 cursor-pointer border-slate-200 transition hover:border-[#0063fe] hover:bg-[#0063fe]/5"
                    style={{
                      borderColor: formData.platformExperience === option.type ? "#0063fe" : undefined,
                      backgroundColor: formData.platformExperience === option.type ? "#eff6ff" : undefined
                    }}
                  >
                    <input
                      type="radio"
                      name="platformExperience"
                      value={option.type}
                      checked={formData.platformExperience === option.type}
                      onChange={(e) => setFormData((prev) => ({
                        ...prev,
                        platformExperience: e.target.value as PlatformExperience
                      }))}
                      className="mt-0.5 mr-3"
                      required
                    />
                    <div>
                      <div className="font-semibold text-[#010a19]">{option.label}</div>
                      <div className="mt-1 text-sm leading-relaxed text-slate-600">{option.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </fieldset>

            {formData.platformExperience ? (
              <div>
                <label
                  htmlFor="organizationName"
                  className="block text-sm font-semibold text-slate-700 mb-2"
                >
                  {formData.platformExperience === "individual"
                    ? "Nom de votre espace"
                    : "Nom de votre organisation"}
                </label>
                <input
                  id="organizationName"
                  type="text"
                  required
                  value={formData.organizationName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, organizationName: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15 shadow-sm"
                  placeholder={
                    formData.platformExperience === "individual"
                      ? "Ex: Mes locations, Appartements Dupont..."
                      : "Ex: Horizon Immobilier, Résidences Liputa..."
                  }
                />
                <p className="mt-2 text-xs text-slate-500">
                  Ce nom sera affiché sur vos baux, vos factures et les fiches publiques de vos logements.
                </p>
              </div>
            ) : null}

            {error !== null && (
              <div className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                <svg className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !formData.platformExperience}
              className="w-full rounded-xl bg-[#0063fe] py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-[#0052d4] hover:shadow-blue-500/35 focus:outline-none focus:ring-2 focus:ring-[#0063fe]/40 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Configuration de l'espace..." : "Configurer et démarrer"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
