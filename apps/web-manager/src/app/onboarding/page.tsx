"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import type { PlatformExperience } from "@hhousing/domain";
import PlatformLogoLink from "../../components/platform-logo-link";

type FlowType = PlatformExperience;

function getFlowType(raw: string | null): FlowType {
  if (raw === "individual") {
    return raw;
  }

  return "entreprise";
}

function getContent(flow: FlowType): { title: string; subtitle: string; steps: string[] } {
  if (flow === "individual") {
    return {
      title: "Bienvenue, particulier",
      subtitle: "Votre espace est optimisé pour une gestion simple de vos biens.",
      steps: [
        "Ajoutez vos propriétés",
        "Créez vos unités locatives",
        "Invitez vos locataires et créez les baux"
      ]
    };
  }

  return {
    title: "Bienvenue",
    subtitle: "Votre espace professionnel est prêt pour gérer l'ensemble de votre activité locative.",
    steps: [
      "Ajoutez vos propriétés (propres et gérées)",
      "Configurez vos unités",
      "Gérez vos locataires, équipe et collectes"
    ]
  };
}

type OnboardingPageProps = {
  searchParams: Promise<{
    flow?: string;
  }>;
};

export default function OnboardingPage({ searchParams }: OnboardingPageProps): React.ReactElement {
  const router = useRouter();
  const params = use(searchParams);
  const flow = getFlowType(params?.flow ?? null);
  const content = getContent(flow);

  const [isNavigating, setIsNavigating] = useState<"dashboard" | "add" | null>(null);

  const handleNavigate = (target: "dashboard" | "add", url: string) => {
    setIsNavigating(target);
    router.push(url);
  };

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
          <PlatformLogoLink centered subtitle="Initialisation de votre espace" />
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 md:p-10">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-slate-900">{content.title}</h1>
            {content.subtitle ? (
              <p className="mt-2 text-sm text-slate-600">{content.subtitle}</p>
            ) : null}
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Prochaines étapes</h2>
              <div className="space-y-3">
                {content.steps.map((step, index) => (
                  <div
                    key={step}
                    className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 text-sm font-bold text-[#0063fe]">
                      {index + 1}
                    </div>
                    <div className="pt-0.5 text-sm font-medium text-slate-700">
                      {step}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-100">
              <button
                onClick={() => handleNavigate("dashboard", `/dashboard?experience=${encodeURIComponent(flow)}`)}
                disabled={isNavigating !== null}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#0063fe] px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-[#0052d4] hover:shadow-blue-500/35 focus:outline-none focus:ring-2 focus:ring-[#0063fe]/40 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isNavigating === "dashboard" ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Connexion au tableau...
                  </>
                ) : (
                  "Accéder au tableau de bord"
                )}
              </button>
              <button
                onClick={() => handleNavigate("add", "/dashboard/properties/add")}
                disabled={isNavigating !== null}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isNavigating === "add" ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-slate-700" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Chargement...
                  </>
                ) : (
                  "Ajouter un bien"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
