"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PlatformExperience } from "@hhousing/domain";
import PlatformLogoLink from "./platform-logo-link";

type WizardStep = "welcome" | "property" | "tenant" | "lease" | "done";

const WIZARD_STEPS: Array<{ id: WizardStep; label: string }> = [
  { id: "welcome", label: "Accueil" },
  { id: "property", label: "Bien" },
  { id: "tenant", label: "Locataire" },
  { id: "lease", label: "Bail" },
  { id: "done", label: "Prêt" }
];

export interface OnboardingProgress {
  propertyCount: number;
  tenantCount: number;
  leaseCount: number;
}

interface OnboardingSetupWizardProps {
  experience: PlatformExperience;
  progress: OnboardingProgress;
  /** Prefill for lease move-in when a single tenant/property exists. */
  firstPropertyId?: string | null;
  firstTenantId?: string | null;
}

function resolveInitialStep(progress: OnboardingProgress): WizardStep {
  if (progress.leaseCount > 0) {
    return "done";
  }
  if (progress.tenantCount > 0 && progress.propertyCount > 0) {
    return "lease";
  }
  if (progress.propertyCount > 0) {
    return "tenant";
  }
  return "welcome";
}

function isStepComplete(step: WizardStep, progress: OnboardingProgress): boolean {
  if (step === "property") {
    return progress.propertyCount > 0;
  }
  if (step === "tenant") {
    return progress.tenantCount > 0;
  }
  if (step === "lease") {
    return progress.leaseCount > 0;
  }
  if (step === "done") {
    return progress.leaseCount > 0;
  }
  return true;
}

export default function OnboardingSetupWizard({
  experience,
  progress,
  firstPropertyId,
  firstTenantId
}: OnboardingSetupWizardProps): React.ReactElement {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>(() => resolveInitialStep(progress));
  const [navigating, setNavigating] = useState(false);

  const stepIndex = WIZARD_STEPS.findIndex((item) => item.id === step);
  const isIndividual = experience === "individual";

  const welcomeCopy = useMemo(() => {
    if (isIndividual) {
      return {
        title: "Bienvenue",
        subtitle: "En quelques étapes, votre premier bien sera prêt à louer."
      };
    }
    return {
      title: "Bienvenue",
      subtitle: "Configurez votre espace professionnel en suivant ces étapes simples."
    };
  }, [isIndividual]);

  function goNext(): void {
    const next = WIZARD_STEPS[stepIndex + 1];
    if (next) {
      setStep(next.id);
    }
  }

  function goBack(): void {
    const previous = WIZARD_STEPS[stepIndex - 1];
    if (previous) {
      setStep(previous.id);
    }
  }

  function navigateTo(url: string): void {
    setNavigating(true);
    router.push(url);
  }

  const propertyHref = "/dashboard/properties/add?from=onboarding";
  const tenantHref = "/dashboard/tenants/add?from=onboarding";
  const leaseQuery = new URLSearchParams({ from: "onboarding" });
  if (firstTenantId) {
    leaseQuery.set("tenantId", firstTenantId);
  }
  if (firstPropertyId) {
    leaseQuery.set("propertyId", firstPropertyId);
  }
  const leaseHref = `/dashboard/leases/move-in?${leaseQuery.toString()}`;

  return (
    <main
      className="relative flex min-h-screen items-center justify-center bg-white px-4 py-12"
      style={{
        backgroundImage: "url('/brand/MOTIFS.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat"
      }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden bg-slate-50/30" />

      <div className="relative w-full max-w-xl">
        <div className="mb-8 text-center">
          <PlatformLogoLink centered subtitle="Configuration guidée" />
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
          <div className="mb-6">
            <div className="flex items-center gap-1 sm:gap-2">
              {WIZARD_STEPS.map((wizardStep, index) => {
                const isCurrent = wizardStep.id === step;
                const isDone = index < stepIndex || isStepComplete(wizardStep.id, progress);
                return (
                  <div key={wizardStep.id} className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
                    <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                          isCurrent
                            ? "bg-[#0063fe] text-white"
                            : isDone
                              ? "bg-[#0063fe]/15 text-[#0063fe]"
                              : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {isDone && !isCurrent ? (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          index + 1
                        )}
                      </div>
                      <span className={`hidden truncate text-xs sm:block ${isCurrent ? "font-semibold text-[#010a19]" : "text-slate-500"}`}>
                        {wizardStep.label}
                      </span>
                    </div>
                    {index < WIZARD_STEPS.length - 1 ? (
                      <div className={`mb-4 hidden h-0.5 flex-1 sm:block ${index < stepIndex || isStepComplete(wizardStep.id, progress) ? "bg-[#0063fe]/40" : "bg-slate-200"}`} />
                    ) : null}
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-center text-sm font-medium text-[#010a19] sm:hidden">
              Étape {stepIndex + 1} sur {WIZARD_STEPS.length} · {WIZARD_STEPS[stepIndex]?.label}
            </p>
          </div>

          {step === "welcome" ? (
            <section className="space-y-5">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-slate-900">{welcomeCopy.title}</h1>
                <p className="mt-2 text-sm text-slate-600">{welcomeCopy.subtitle}</p>
              </div>
              <div className="space-y-3">
                {[
                  { title: "Ajouter un bien", detail: "Adresse, loyer et devise (CDF ou USD)." },
                  { title: "Ajouter un locataire", detail: "Nom et téléphone WhatsApp." },
                  { title: "Enregistrer le bail", detail: "Qui habite où, loyer et caution." }
                ].map((item, index) => (
                  <div
                    key={item.title}
                    className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-[#0063fe]">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#010a19]">{item.title}</p>
                      <p className="mt-0.5 text-sm text-slate-600">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {step === "property" ? (
            <section className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Ajoutez votre premier bien</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Une maison, un appartement ou un immeuble. Une seule décision à la fois.
                </p>
              </div>
              {progress.propertyCount > 0 ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                  <p className="text-sm font-semibold text-emerald-900">
                    {progress.propertyCount} bien{progress.propertyCount > 1 ? "s" : ""} enregistré{progress.propertyCount > 1 ? "s" : ""}
                  </p>
                  <p className="mt-1 text-sm text-emerald-800">Vous pouvez passer à l&apos;étape suivante.</p>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={navigating}
                  onClick={() => navigateTo(propertyHref)}
                  className="w-full rounded-xl border border-[#0063fe] bg-[#0063fe]/5 px-4 py-4 text-left transition hover:bg-[#0063fe]/10 disabled:opacity-60"
                >
                  <p className="font-semibold text-[#010a19]">Ouvrir l&apos;assistant bien</p>
                  <p className="mt-1 text-sm text-slate-600">Type → adresse → loyer → confirmation.</p>
                </button>
              )}
            </section>
          ) : null}

          {step === "tenant" ? (
            <section className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Ajoutez votre premier locataire</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Commencez par le nom et le numéro WhatsApp (+243). Le reste peut attendre.
                </p>
              </div>
              {progress.tenantCount > 0 ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                  <p className="text-sm font-semibold text-emerald-900">
                    {progress.tenantCount} locataire{progress.tenantCount > 1 ? "s" : ""} enregistré{progress.tenantCount > 1 ? "s" : ""}
                  </p>
                  <p className="mt-1 text-sm text-emerald-800">Passez à l&apos;enregistrement du bail.</p>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={navigating || progress.propertyCount === 0}
                  onClick={() => navigateTo(tenantHref)}
                  className="w-full rounded-xl border border-[#0063fe] bg-[#0063fe]/5 px-4 py-4 text-left transition hover:bg-[#0063fe]/10 disabled:opacity-60"
                >
                  <p className="font-semibold text-[#010a19]">Ouvrir l&apos;assistant locataire</p>
                  <p className="mt-1 text-sm text-slate-600">Nom + téléphone WhatsApp en priorité.</p>
                </button>
              )}
              {progress.propertyCount === 0 ? (
                <p className="text-sm text-amber-700">Ajoutez d&apos;abord un bien pour continuer.</p>
              ) : null}
            </section>
          ) : null}

          {step === "lease" ? (
            <section className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Enregistrez le bail</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Reliez le locataire au logement : loyer, dates et caution.
                </p>
              </div>
              {progress.leaseCount > 0 ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                  <p className="text-sm font-semibold text-emerald-900">
                    {progress.leaseCount} bail{progress.leaseCount > 1 ? "x" : ""} enregistré{progress.leaseCount > 1 ? "s" : ""}
                  </p>
                  <p className="mt-1 text-sm text-emerald-800">Votre espace est prêt.</p>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={navigating || progress.propertyCount === 0 || progress.tenantCount === 0}
                  onClick={() => navigateTo(leaseHref)}
                  className="w-full rounded-xl border border-[#0063fe] bg-[#0063fe]/5 px-4 py-4 text-left transition hover:bg-[#0063fe]/10 disabled:opacity-60"
                >
                  <p className="font-semibold text-[#010a19]">Ouvrir l&apos;assistant bail</p>
                  <p className="mt-1 text-sm text-slate-600">Qui → où → loyer → caution → confirmer.</p>
                </button>
              )}
              {progress.propertyCount === 0 || progress.tenantCount === 0 ? (
                <p className="text-sm text-amber-700">Il faut un bien et un locataire avant de créer le bail.</p>
              ) : null}
            </section>
          ) : null}

          {step === "done" ? (
            <section className="space-y-5 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Vous êtes prêt</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Votre tableau de bord affichera loyers, paiements et locataires.
                </p>
              </div>
              <dl className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-left text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Biens</dt>
                  <dd className="font-medium text-[#010a19]">{progress.propertyCount}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Locataires</dt>
                  <dd className="font-medium text-[#010a19]">{progress.tenantCount}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Contrats</dt>
                  <dd className="font-medium text-[#010a19]">{progress.leaseCount}</dd>
                </div>
              </dl>
            </section>
          ) : null}

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-between">
            {stepIndex > 0 && step !== "done" ? (
              <button
                type="button"
                onClick={goBack}
                disabled={navigating}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Retour
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigateTo(`/dashboard?experience=${encodeURIComponent(experience)}`)}
                disabled={navigating}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {step === "done" ? "Plus tard" : "Passer pour l'instant"}
              </button>
            )}

            {step === "welcome" ? (
              <button
                type="button"
                onClick={goNext}
                disabled={navigating}
                className="rounded-xl bg-[#0063fe] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:bg-[#0052d4] disabled:opacity-60"
              >
                Commencer
              </button>
            ) : null}

            {step === "property" || step === "tenant" || step === "lease" ? (
              <button
                type="button"
                onClick={goNext}
                disabled={navigating || !isStepComplete(step, progress)}
                className="rounded-xl bg-[#0063fe] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:bg-[#0052d4] disabled:opacity-60"
              >
                Continuer
              </button>
            ) : null}

            {step === "done" ? (
              <button
                type="button"
                onClick={() => navigateTo(`/dashboard?experience=${encodeURIComponent(experience)}`)}
                disabled={navigating}
                className="rounded-xl bg-[#0063fe] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:bg-[#0052d4] disabled:opacity-60"
              >
                Accéder au tableau de bord
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
