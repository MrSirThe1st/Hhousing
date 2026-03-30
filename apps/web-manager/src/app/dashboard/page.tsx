type DashboardVariant = "self_managed_owner" | "manager_for_others" | "mixed_operator" | "tenant" | "standard";

type DashboardPageProps = {
  searchParams?: {
    variant?: string;
  };
};

function getVariant(raw?: string): DashboardVariant {
  if (raw === "self_managed_owner") return raw;
  if (raw === "manager_for_others") return raw;
  if (raw === "mixed_operator") return raw;
  if (raw === "tenant") return raw;
  return "standard";
}

function getVariantHeader(variant: DashboardVariant): { title: string; subtitle: string } {
  if (variant === "self_managed_owner") {
    return {
      title: "Vue propriétaire-opérateur",
      subtitle: "Focus revenus, occupation, profit"
    };
  }

  if (variant === "manager_for_others") {
    return {
      title: "Vue property manager",
      subtitle: "Focus tâches, maintenance, collecte"
    };
  }

  if (variant === "mixed_operator") {
    return {
      title: "Vue hybride",
      subtitle: "Revenus owned + opérations managed"
    };
  }

  if (variant === "tenant") {
    return {
      title: "Vue démarrage",
      subtitle: "Créez votre première propriété ou rejoignez une organisation"
    };
  }

  return {
    title: "Vue d'ensemble",
    subtitle: "Suivi global de vos opérations"
  };
}

function getStats(variant: DashboardVariant): Array<{ label: string; value: string }> {
  if (variant === "self_managed_owner") {
    return [
      { label: "Revenus mensuels", value: "—" },
      { label: "Taux d'occupation", value: "—" },
      { label: "Marge estimée", value: "—" },
      { label: "Vos propriétés", value: "—" },
      { label: "Vos locataires", value: "—" },
      { label: "Loyers à percevoir", value: "—" }
    ];
  }

  if (variant === "manager_for_others") {
    return [
      { label: "Tâches ouvertes", value: "—" },
      { label: "Incidents maintenance", value: "—" },
      { label: "Collecte en attente", value: "—" },
      { label: "Biens gérés", value: "—" },
      { label: "Clients / propriétaires", value: "—" },
      { label: "Locataires actifs", value: "—" }
    ];
  }

  if (variant === "mixed_operator") {
    return [
      { label: "Revenus (owned)", value: "—" },
      { label: "Collecte (managed)", value: "—" },
      { label: "Occupation globale", value: "—" },
      { label: "Propriétés owned", value: "—" },
      { label: "Propriétés managed", value: "—" },
      { label: "Demandes en cours", value: "—" }
    ];
  }

  if (variant === "tenant") {
    return [
      { label: "Propriétés", value: "0" },
      { label: "Unités", value: "0" },
      { label: "Locataires", value: "0" },
      { label: "Baux actifs", value: "0" },
      { label: "Actions recommandées", value: "2" },
      { label: "Progression setup", value: "0%" }
    ];
  }

  return [
    { label: "Propriétés", value: "—" },
    { label: "Locataires actifs", value: "—" },
    { label: "Loyers en attente", value: "—" },
    { label: "Baux actifs", value: "—" },
    { label: "Paiements ce mois", value: "—" },
    { label: "Demandes en cours", value: "—" }
  ];
}

export default function DashboardPage({ searchParams }: DashboardPageProps): React.ReactElement {
  const variant = getVariant(searchParams?.variant);
  const header = getVariantHeader(variant);
  const stats = getStats(variant);

  // Neutralize variant param after first visit
  // Only run client-side
  if (typeof window !== "undefined" && searchParams?.variant) {
    const url = new URL(window.location.href);
    url.searchParams.delete("variant");
    window.history.replaceState({}, "", url.pathname + url.search);
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-[#010a19] mb-1">{header.title}</h1>
      <p className="mb-6 text-sm text-gray-600">{header.subtitle}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="mt-1 text-3xl font-semibold text-[#010a19]">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
