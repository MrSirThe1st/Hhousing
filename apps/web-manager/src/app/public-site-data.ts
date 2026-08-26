import type { PublicListingFilter, PublicListingSort } from "@hhousing/api-contracts";

/** Must match manager amenity catalog in property-form-options.ts */
const ALLOWED_AMENITIES = new Set([
  "Parking",
  "Eau courante",
  "Electricite",
  "Gardien",
  "Internet fibre",
  "Ascenseur"
]);

/** Must match manager feature catalog in property-form-options.ts */
const ALLOWED_FEATURES = new Set([
  "Balcon",
  "Cuisine equipee",
  "Climatisation",
  "Jardin",
  "Piscine",
  "Groupe electrogene"
]);

export type PublicMarketplaceSearchParams = {
  q?: string | string[];
  city?: string | string[];
  minRent?: string | string[];
  maxRent?: string | string[];
  propertyType?: string | string[];
  minBedrooms?: string | string[];
  minBathrooms?: string | string[];
  amenities?: string | string[];
  features?: string | string[];
  sort?: string | string[];
  page?: string | string[];
};

export function firstSearchParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export const FEATURE_GROUPS = [
  {
    title: "Opérations du quotidien",
    description:
      "Fini les carnets et les fichiers Excel. Créez vos contrats, suivez qui a payé, et gardez documents et dossiers sous la main.",
    items: [
      "Création rapide de contrats",
      "Suivi en direct des loyers",
      "Alertes de maintenance",
      "Documents centralisés"
    ]
  },
  {
    title: "Communication fluide",
    description:
      "Restez en contact avec vos locataires sans y passer vos soirées. Messagerie intégrée, demandes structurées, coordination d'équipe.",
    items: [
      "Messagerie intégrée",
      "Demandes de maintenance avec photos",
      "Gestion d'équipe à plusieurs",
      "Annonces optionnelles"
    ]
  },
  {
    title: "Vision claire de l'argent",
    description:
      "Voyez d'un coup d'œil les loyers en retard, l'occupation et les tendances — puis exportez vos rapports.",
    items: [
      "Suivi par bien et logement",
      "Taux d'occupation",
      "Espace propriétaire (lecture)",
      "Rapports financiers"
    ]
  }
] as const;

/** DoorLoop-style deep feature blocks — only capabilities the product offers. */
export const OPERATION_FEATURES = [
  {
    id: "rent",
    title: "Encaissez vos loyers à temps",
    description:
      "Suivez paiements, retards et relances sur tout votre portefeuille. Enregistrez les règlements Mobile Money ou espèces — vos tableaux se mettent à jour.",
    items: [
      "Suivi payé / en retard / en attente",
      "Enregistrement manuel (Mobile Money, cash)",
      "Vue claire des impayés du mois",
      "Rapports et exports pour votre comptabilité"
    ]
  },
  {
    id: "maintenance",
    title: "Une maintenance qui avance",
    description:
      "Les locataires signalent un problème depuis l'app. Vous recevez la demande, assignez un intervenant et suivez jusqu'à la résolution — sans chaînes d'e-mails perdues.",
    items: [
      "Demandes avec photos et statut",
      "Assignation prestataire ou équipe",
      "Suivi jusqu'à clôture",
      "Historique par logement"
    ]
  },
  {
    id: "leases",
    title: "Contrats et locataires, un seul flux",
    description:
      "De l'affectation au bail actif : créez le contrat, suivez dépôt et échéances, et gardez le dossier locataire complet au même endroit.",
    items: [
      "Biens, logements et baux liés",
      "Invitations locataires",
      "Documents de bail et pièces jointes",
      "Entrées et sorties structurées"
    ]
  },
  {
    id: "messaging",
    title: "Messagerie et documents au même endroit",
    description:
      "Échangez avec vos locataires dans la plateforme, diffusez des messages par bien, et stockez contrats, quittances et notices sans chercher dans WhatsApp.",
    items: [
      "Conversations locataire ↔ gestionnaire",
      "Messages groupés par bien",
      "Bibliothèque de documents",
      "Référence claire par dossier"
    ]
  }
] as const;

export const USE_CASES = [
  {
    title: "Bailleurs particuliers",
    description:
      "Un studio ou plusieurs maisons en ville : suivez contrats, loyers et interventions sans Excel ni carnets."
  },
  {
    title: "Gestionnaires & agences",
    description:
      "Pilotez plusieurs immeubles, centralisez les demandes clients, coordonnez l'équipe et suivez l'argent."
  },
  {
    title: "Portefeuilles mixtes",
    description:
      "Résidentiel, immeubles et locaux : une même plateforme pour chaque bien, chaque logement, chaque transaction."
  },
  {
    title: "Locataires (app mobile)",
    description:
      "Vos locataires paient, signalent un problème et communiquent depuis l'application — vous gardez le contrôle côté web."
  }
] as const;

export const WHY_HARAKA = [
  {
    title: "Une plateforme qui scale avec vous",
    description:
      "Ajoutez biens et logements au fur et à mesure. Tableau de bord, alertes et historiques restent lisibles."
  },
  {
    title: "Pensé pour la RDC",
    description:
      "Interface en français, Mobile Money, et workflows adaptés aux réalités du terrain — pas un clone importé."
  },
  {
    title: "Moins de friction, plus de contrôle",
    description:
      "Moins d'outils éparpillés. Loyers, maintenance, messagerie et documents dans un seul endroit."
  }
] as const;

export const PORTFOLIO_TYPES = [
  { title: "Résidentiel", description: "Appartements et maisons" },
  { title: "Immeubles", description: "Multi-logements" },
  { title: "Maisons individuelles", description: "Villas et compounds" },
  { title: "Locaux commerciaux", description: "Bureaux et boutiques" }
] as const;

export const FAQS = [
  {
    question: "Haraka Property est-il seulement une marketplace ?",
    answer:
      "Non. Les annonces aident à trouver des locataires. Le cœur du produit, c'est la gestion : biens, logements, locataires, contrats, paiements, maintenance, messagerie et documents."
  },
  {
    question: "Qui peut utiliser la plateforme aujourd'hui ?",
    answer:
      "L'espace web est conçu pour les bailleurs et gestionnaires immobiliers. Les locataires utilisent l'application mobile. Les propriétaires investisseurs disposent d'un portail en lecture seule."
  },
  {
    question: "Faut-il publier des annonces pour utiliser Haraka Property ?",
    answer:
      "Non. Vous pouvez gérer tous vos biens en interne sans rien publier. Les annonces restent optionnelles et s'appuient sur les mêmes fiches biens et logements."
  },
  {
    question: "Comment fonctionne la tarification ?",
    answer:
      "Gratuit sous 2 biens. À partir de 2 biens, le tarif est de 5$ par logement et par mois. Vous réglez par Mobile Money en fin de mois — sans prélèvement automatique."
  },
  {
    question: "Comment réserver une démo ?",
    answer:
      "Utilisez la page « Réserver une démo » ou contactez-nous sur WhatsApp. Nous planifions une session courte adaptée à votre portefeuille."
  }
] as const;

export const PRICING_TIERS = [
  {
    name: "Gratuit",
    price: "0$ / mois",
    description: "Idéal pour démarrer : jusqu'à 1 bien (maison ou immeuble) sans frais d'abonnement.",
    features: ["Moins de 2 biens", "Tous les outils de gestion", "Support chat", "Sans carte bancaire"]
  },
  {
    name: "Professionnel",
    price: "5$ / logement / mois",
    description:
      "À partir de 2 biens : tarif simple au logement. Paiement Mobile Money en fin de mois — pas de prélèvement automatique.",
    features: [
      "Facturation au logement",
      "Paiement Mobile Money mensuel",
      "Suivi automatisé des loyers",
      "Gestion complète des réparations",
      "Invitations d'équipe"
    ]
  }
] as const;


export const MARKETPLACE_PREVIEW_LIMIT = 10;
export const MARKETPLACE_PAGE_SIZE = 12;

export function parseMarketplacePage(value: string | string[] | undefined): number {
  const parsed = Number(firstSearchParam(value));
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return Math.floor(parsed);
}

export function parseMarketplaceSort(value: string | string[] | undefined): PublicListingSort {
  const raw = firstSearchParam(value);
  if (raw === "price_asc" || raw === "price_desc" || raw === "newest") {
    return raw;
  }
  return "newest";
}

export function parseStringListParam(value: string | string[] | undefined): string[] {
  if (!value) {
    return [];
  }
  const parts = Array.isArray(value) ? value : value.split(",");
  return parts
    .flatMap((part) => part.split(","))
    .map((part) => part.trim())
    .filter(Boolean);
}

export function buildMarketplaceHref(
  params: PublicMarketplaceSearchParams | undefined,
  page: number
): string {
  const search = new URLSearchParams();
  const q = firstSearchParam(params?.q)?.trim();
  const city = firstSearchParam(params?.city)?.trim();
  const propertyType = firstSearchParam(params?.propertyType);
  const minRent = firstSearchParam(params?.minRent);
  const maxRent = firstSearchParam(params?.maxRent);
  const minBedrooms = firstSearchParam(params?.minBedrooms);
  const minBathrooms = firstSearchParam(params?.minBathrooms);
  const sort = parseMarketplaceSort(params?.sort);
  const amenities = parseStringListParam(params?.amenities).filter((item) => ALLOWED_AMENITIES.has(item));
  const features = parseStringListParam(params?.features).filter((item) => ALLOWED_FEATURES.has(item));

  if (q) search.set("q", q);
  if (city) search.set("city", city);
  if (propertyType) search.set("propertyType", propertyType);
  if (minRent) search.set("minRent", minRent);
  if (maxRent) search.set("maxRent", maxRent);
  if (minBedrooms) search.set("minBedrooms", minBedrooms);
  if (minBathrooms) search.set("minBathrooms", minBathrooms);
  for (const amenity of amenities) {
    search.append("amenities", amenity);
  }
  for (const feature of features) {
    search.append("features", feature);
  }
  if (sort !== "newest") search.set("sort", sort);
  if (page > 1) search.set("page", String(page));
  const query = search.toString();
  return query ? `/marketplace?${query}` : "/marketplace";
}

export function parseOptionalNumber(value: string | string[] | undefined): number | null {
  const raw = firstSearchParam(value);
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function buildPublicListingFilter(
  params?: PublicMarketplaceSearchParams,
  options?: { pageSize?: number; page?: number; limit?: number; offset?: number }
): PublicListingFilter {
  const propertyType = firstSearchParam(params?.propertyType);
  const amenities = parseStringListParam(params?.amenities).filter((item) => ALLOWED_AMENITIES.has(item));
  const features = parseStringListParam(params?.features).filter((item) => ALLOWED_FEATURES.has(item));
  const pageSize = options?.pageSize ?? MARKETPLACE_PAGE_SIZE;
  const page = options?.page ?? parseMarketplacePage(params?.page);
  const limit = options?.limit ?? pageSize;
  const offset = options?.offset ?? (page - 1) * pageSize;

  return {
    q: firstSearchParam(params?.q)?.trim() || null,
    city: firstSearchParam(params?.city)?.trim() || null,
    minRent: parseOptionalNumber(params?.minRent),
    maxRent: parseOptionalNumber(params?.maxRent),
    propertyType:
      propertyType === "single_unit" || propertyType === "multi_unit"
        ? propertyType
        : null,
    minBedrooms: parseOptionalNumber(params?.minBedrooms),
    minBathrooms: parseOptionalNumber(params?.minBathrooms),
    amenities: amenities.length > 0 ? amenities : null,
    features: features.length > 0 ? features : null,
    sort: parseMarketplaceSort(params?.sort),
    limit,
    offset
  };
}
