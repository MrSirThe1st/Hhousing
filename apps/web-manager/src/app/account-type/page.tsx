"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OperatorAccountType } from "@hhousing/api-contracts";

type FormData = {
  accountType: OperatorAccountType | "";
  organizationName: string;
};

export default function AccountTypePage(): React.ReactElement {
  const router = useRouter();
  const enabledAccountType: OperatorAccountType = "mixed_operator";
  const [formData, setFormData] = useState<FormData>({
    accountType: "",
    organizationName: ""
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);


  const picker = [
    {
      type: "self_managed_owner" as const,
      label: "Je gère mes propres locations",
      description: "Vous êtes propriétaire et gérez vos propres biens en location",
      enabled: false
    },
    {
      type: "manager_for_others" as const,
      label: "Je gère les locations pour d'autres",
      description: "Vous êtes gestionnaire professionnel ou agent immobilier",
      enabled: false
    },
    {
      type: "mixed_operator" as const,
      label: "Je gère un mélange des deux",
      description: "Vous possédez des biens ET en gérez pour d'autres",
      enabled: true
    },
    {
      type: "tenant" as const,
      label: "Je ne gère pas encore de location",
      description: "Vous démarrez: création de votre premier bien ou rejoindre une organisation",
      enabled: false
    }
  ];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);

    if (!formData.accountType) {
      setError("Veuillez sélectionner un type de compte");
      return;
    }

    if (formData.accountType !== enabledAccountType) {
      setError("Ce parcours n'est pas encore disponible.");
      return;
    }

    // Redirect tenant selection to mobile app download page
    if (formData.accountType === "tenant") {
      router.push("/mobile-app");
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
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-2xl">
        {/* Logo / Brand */}
        <div className="mb-12 text-center">
          <span className="text-3xl font-semibold tracking-tight text-[#010a19]">
            hhousing
          </span>
          <p className="mt-2 text-sm text-gray-600">Espace gestionnaire</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h1 className="text-2xl font-semibold text-[#010a19] mb-2">Configurez votre compte</h1>
          <p className="text-gray-600 mb-8">Quel type de gestionnaire êtes-vous ?</p>
          <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Pour le moment, seul le parcours "Je gère un mélange des deux" est disponible. Les autres options arrivent bientôt.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Account Type Selection */}
            <fieldset>
              <legend className="text-sm font-medium text-gray-700 mb-3">
                Qui êtes-vous ?
              </legend>
              <div className="grid grid-cols-1 gap-3">
                {picker.map((option) => (
                  <label
                    key={option.type}
                    className={`flex items-start rounded-lg border-2 p-4 transition ${
                      option.enabled
                        ? "cursor-pointer border-gray-200 hover:border-[#0063fe] hover:bg-[#0063fe]/5"
                        : "cursor-not-allowed border-gray-200 bg-gray-50 opacity-60"
                    }`}
                    style={{
                      borderColor: formData.accountType === option.type ? "#0063fe" : undefined,
                      backgroundColor: formData.accountType === option.type ? "#eff6ff" : undefined
                    }}
                  >
                    <input
                      type="radio"
                      name="accountType"
                      value={option.type}
                      checked={formData.accountType === option.type}
                      disabled={!option.enabled}
                      onChange={(e) => setFormData(prev => ({ ...prev, accountType: e.target.value as OperatorAccountType }))}
                      className="mt-0.5 mr-3"
                      required
                    />
                    <div>
                      <div className="font-medium text-[#010a19]">
                        {option.label}
                        {!option.enabled ? <span className="ml-2 text-xs font-medium text-amber-700">Bientot disponible</span> : null}
                      </div>
                      <div className="text-sm text-gray-600">{option.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Organization Name */}
            {formData.accountType && (
              <div>
                <label
                  htmlFor="organizationName"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Nom de votre organisation
                </label>
                <input
                  id="organizationName"
                  type="text"
                  required
                  value={formData.organizationName}
                  onChange={(e) => setFormData(prev => ({ ...prev, organizationName: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-[#010a19] placeholder-gray-400 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/20"
                  placeholder="ex. Gestion Immobilière Dupont"
                />
              </div>
            )}

            {error !== null && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !formData.accountType}
              className="w-full rounded-lg bg-[#0063fe] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0052d4] focus:outline-none focus:ring-2 focus:ring-[#0063fe]/40 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Création en cours…" : "Créer le compte"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
