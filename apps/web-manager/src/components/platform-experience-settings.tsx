"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { PlatformExperience } from "@hhousing/domain";
import { patchWithAuth } from "../lib/api-client";
import { isIndividualExperience } from "../lib/platform-experience";

interface PlatformExperienceSettingsProps {
  initialExperience: PlatformExperience;
  canEdit: boolean;
}

const EXPERIENCE_OPTIONS: Array<{
  type: PlatformExperience;
  label: string;
  description: string;
}> = [
  {
    type: "entreprise",
    label: "Entreprise",
    description: "Tous les outils professionnels: équipe, propriétaires mandants, facturation avancée."
  },
  {
    type: "individual",
    label: "Particulier",
    description: "Interface simplifiée pour gérer vos propres biens locatifs."
  }
];

export default function PlatformExperienceSettings({
  initialExperience,
  canEdit
}: PlatformExperienceSettingsProps): React.ReactElement {
  const router = useRouter();
  const [experience, setExperience] = useState<PlatformExperience>(initialExperience);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setExperience(initialExperience);
  }, [initialExperience]);

  async function handleExperienceChange(nextExperience: PlatformExperience): Promise<void> {
    if (!canEdit || nextExperience === experience) {
      return;
    }

    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      const result = await patchWithAuth<{ experience: PlatformExperience }>("/api/operator-context", {
        platformExperience: nextExperience
      });

      if (!result.success) {
        setError(result.error);
        setBusy(false);
        return;
      }

      setExperience(result.data.experience);
      setMessage(
        isIndividualExperience(result.data.experience)
          ? "Expérience particulier activée."
          : "Expérience entreprise activée."
      );
      setBusy(false);
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Erreur de mise à jour.");
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <div>
        <h2 className="text-base font-semibold text-[#010a19]">Expérience plateforme</h2>
        <p className="mt-1 text-sm text-slate-500">
          Choisissez entre l&apos;expérience entreprise (complète) et particulier (simplifiée).
        </p>
      </div>

      {message ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {!canEdit ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Seul le créateur initial du compte peut changer l&apos;expérience plateforme.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {EXPERIENCE_OPTIONS.map((option) => {
          const isActive = experience === option.type;

          return (
            <button
              key={option.type}
              type="button"
              disabled={busy || !canEdit}
              onClick={() => {
                void handleExperienceChange(option.type);
              }}
              className={`rounded-xl border-2 p-4 text-left transition ${
                isActive
                  ? "border-[#0063fe] bg-blue-50/60"
                  : "border-slate-200 bg-white hover:border-[#0063fe]/60 hover:bg-slate-50"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <div className="text-sm font-semibold text-slate-900">{option.label}</div>
              <div className="mt-1 text-xs leading-relaxed text-slate-500">{option.description}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
