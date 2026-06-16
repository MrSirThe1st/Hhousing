"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OperatorAccountType } from "@hhousing/api-contracts";
import PlatformLogoLink from "../../components/platform-logo-link";

type FormData = {
  accountType: OperatorAccountType;
  organizationName: string;
};

export default function AccountTypePage(): React.ReactElement {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    accountType: "mixed_operator",
    organizationName: ""
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);

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
          accountType: formData.accountType,
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

      // Success - redirect to onboarding variant (transient UX only)
      router.push(`/onboarding?flow=${encodeURIComponent(formData.accountType)}`);
    } catch (err) {
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
        {/* Logo / Brand */}
        <div className="mb-10 text-center">
          <PlatformLogoLink centered subtitle="Espace gestionnaire" />
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Configurez votre compte</h1>
            <p className="mt-2 text-sm text-slate-600">Initialisez vos paramètres d'exploitation</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Unified Card for Mixed Operator */}
            <div className="relative overflow-hidden rounded-2xl border-2 border-[#0063fe] bg-blue-50/20 p-6 shadow-sm">
              <div className="absolute top-0 right-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-[#0063fe]/5 blur-lg pointer-events-none" />
              
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-[#0063fe] text-white shadow-md shadow-blue-500/20">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#010a19]">Compte Opérateur Locatif</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Ce profil unifié convient aussi bien si vous gérez <strong>vos propres biens</strong> (propriétaire direct) que si vous gérez des biens <strong>pour le compte de tiers</strong> (gestionnaire professionnel, agence).
                  </p>
                </div>
              </div>
            </div>

            {/* Organization Name Input */}
            <div>
              <label
                htmlFor="organizationName"
                className="block text-sm font-semibold text-slate-700 mb-2"
              >
                Nom de votre organisation
              </label>
              <input
                id="organizationName"
                type="text"
                required
                value={formData.organizationName}
                onChange={(e) => setFormData(prev => ({ ...prev, organizationName: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15 shadow-sm"
                placeholder="Ex: Horizon Immobilier, Résidences Liputa..."
              />
              <p className="mt-2 text-xs text-slate-500">
                Ce nom sera affiché sur vos baux, vos factures et les fiches publiques de vos logements.
              </p>
            </div>

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
              disabled={loading}
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
