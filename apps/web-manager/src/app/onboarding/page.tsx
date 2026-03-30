"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

type FlowType = "self_managed_owner" | "manager_for_others" | "mixed_operator" | "tenant";

type OnboardingContent = {
  title: string;
  subtitle: string;
  steps: string[];
  cta: string;
};

function getFlowType(raw: string | null): FlowType {
  if (raw === "self_managed_owner") return raw;
  if (raw === "manager_for_others") return raw;
  if (raw === "mixed_operator") return raw;
  return "tenant";
}

function getContent(flow: FlowType): OnboardingContent {
  if (flow === "self_managed_owner") {
    return {
      title: "Bienvenue, propriétaire-opérateur",
      subtitle: "Votre espace est optimisé pour revenus, occupation et rentabilité.",
      steps: ["Ajouter votre propriété", "Ajouter vos unités", "Commencer la collecte de loyer"],
      cta: "Ouvrir votre tableau propriétaire"
    };
  }

  if (flow === "manager_for_others") {
    return {
      title: "Bienvenue, property manager",
      subtitle: "Votre espace met l'accent sur opérations, tâches et communication.",
      steps: ["Ajouter une propriété gérée", "Inviter un propriétaire", "Ajouter les locataires"],
      cta: "Ouvrir votre tableau gestion"
    };
  }

  if (flow === "mixed_operator") {
    return {
      title: "Bienvenue, opérateur hybride",
      subtitle: "Vous verrez revenus (owned) et opérations (managed) ensemble.",
      steps: ["Ajouter vos biens owned", "Ajouter vos biens managed", "Inviter des propriétaires si nécessaire"],
      cta: "Ouvrir votre tableau hybride"
    };
  }

  return {
    title: "Bienvenue",
    subtitle: "On vous guide pour lancer votre activité immobilière rapidement.",
    steps: ["Créer votre première propriété", "Ou rejoindre une organisation existante", "Configurer vos premières unités"],
    cta: "Commencer la configuration"
  };
}

export default function OnboardingPage(): React.ReactElement {
  const searchParams = useSearchParams();
  const flow = getFlowType(searchParams.get("flow"));
  const content = getContent(flow);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold text-[#010a19]">{content.title}</h1>
          <p className="mt-2 text-gray-600">{content.subtitle}</p>
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-[#010a19]">Parcours recommandé</h2>
          <ol className="mt-4 space-y-3">
            {content.steps.map((step, index) => (
              <li key={step} className="flex items-start gap-3">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#0063fe] text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <span className="pt-0.5 text-gray-700">{step}</span>
              </li>
            ))}
          </ol>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/dashboard?variant=${encodeURIComponent(flow)}`}
              className="rounded-lg bg-[#0063fe] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0052d4]"
            >
              {content.cta}
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Aller au tableau standard
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
