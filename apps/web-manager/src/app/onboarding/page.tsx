import Link from "next/link";

type FlowType = "self_managed_owner" | "manager_for_others" | "mixed_operator" | "tenant";

function getFlowType(raw: string | null): FlowType {
  if (raw === "self_managed_owner") return raw;
  if (raw === "manager_for_others") return raw;
  if (raw === "mixed_operator") return raw;
  return "tenant";
}

function getContent(flow: FlowType): { title: string; subtitle: string; steps: string[] } {
  if (flow === "self_managed_owner") {
    return {
      title: "Bienvenue, propriétaire-opérateur",
      subtitle: "Votre espace est optimisé pour revenus, occupation et rentabilité.",
      steps: [
        "Ajoutez vos propriétés depuis l'onglet Propriétés",
        "Créez vos unités locatives",
        "Invitez vos locataires et créez les baux"
      ]
    };
  }
  if (flow === "manager_for_others") {
    return {
      title: "Bienvenue, property manager",
      subtitle: "Votre espace met l'accent sur opérations, tâches et communication.",
      steps: [
        "Ajoutez les propriétés que vous gérez",
        "Configurez les unités et tarifs",
        "Gérez vos locataires et collecte de loyer"
      ]
    };
  }
  if (flow === "mixed_operator") {
    return {
      title: "Bienvenue, opérateur hybride",
      subtitle: "Vous verrez revenus (owned) et opérations (managed) ensemble.",
      steps: [
        "Ajoutez vos propriétés (owned et managed)",
        "Configurez vos unités",
        "Gérez locataires et collecte"
      ]
    };
  }
  return {
    title: "Bienvenue",
    subtitle: "Commencez à gérer vos propriétés facilement.",
    steps: [
      "Ajoutez vos propriétés",
      "Créez vos unités",
      "Gérez vos locataires"
    ]
  };
}

type OnboardingPageProps = {
  searchParams?: Promise<{
    flow?: string;
  }>;
};

export default async function OnboardingPage({ searchParams }: OnboardingPageProps): Promise<React.ReactElement> {
  const params = await searchParams;
  const flow = getFlowType(params?.flow ?? null);
  const content = getContent(flow);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 flex items-center justify-center">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold text-[#010a19]">{content.title}</h1>
          <p className="mt-2 text-gray-600">{content.subtitle}</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-[#010a19] mb-4">Prochaines étapes</h2>
          <ol className="space-y-3 mb-8">
            {content.steps.map((step, index) => (
              <li key={step} className="flex items-start gap-3">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#0063fe] text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <span className="pt-0.5 text-gray-700">{step}</span>
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/dashboard?variant=${encodeURIComponent(flow)}`}
              className="rounded-lg bg-[#0063fe] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0052d4]"
            >
              Accéder au tableau de bord
            </Link>
            <Link
              href="/dashboard/properties"
              className="rounded-lg border border-[#0063fe] px-4 py-2.5 text-sm font-semibold text-[#0063fe] hover:bg-[#0063fe]/5"
            >
              Ajouter une propriété
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
