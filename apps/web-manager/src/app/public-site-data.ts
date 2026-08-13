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
    title: "Votre quotidien simplifié",
    description: "Fini les carnets et les fichiers Excel. Créez vos contrats en quelques clics, suivez qui a payé le loyer, et gardez vos documents (contrats, pièces d'identité) sous la main.",
    items: ["Création rapide de contrats", "Suivi en direct des loyers", "Alertes de réparations", "Mes documents"]
  },
  {
    title: "Des échanges fluides",
    description: "Restez en contact avec vos locataires sans y passer vos soirées. Discutez via WhatsApp ou la messagerie, recevez les demandes, et organisez les visites simplement.",
    items: ["Messagerie intégrée", "Dossiers de candidature en ligne", "Gestion d'équipe à plusieurs", "Partage simple d'annonces"]
  },
  {
    title: "Une vision claire de l'argent",
    description: "Sachez exactement où vous en êtes. D'un coup d'œil, voyez les loyers en retard, les logements occupés, et générez vos rapports.",
    items: ["Suivi par bien et logement", "Occupation de vos biens", "Espace de collaboration", "Rapports simples"]
  }
] as const;

export const USE_CASES = [
  {
    title: "Bailleurs particuliers",
    description: "Que vous gériez un studio ou plusieurs maisons en ville, suivez vos contrats, encaissez vos loyers et gérez les imprévus sans stress."
  },
  {
    title: "Gestionnaires & Agences",
    description: "Pilotez beaucoup de maisons et d'immeubles. Centralisez les demandes de vos clients, suivez l'argent et coordonnez les équipes sur le terrain."
  },
  {
    title: "Recherche résidentielle & commerciale",
    description: "Trouvez votre futur logement (maison, appartement, studio) ou dénichez les locaux pour votre activité (bureaux, boutiques, entrepôts)."
  },
  {
    title: "Locataires au quotidien",
    description: "Accédez à vos quittances de loyer, signalez un problème (eau, électricité, plomberie) et communiquez facilement avec votre bailleur."
  }
] as const;

export const FAQS = [
  {
    question: "Haraka Property est-il seulement une marketplace ?",
    answer:
      "Non. Les annonces aident à trouver des locataires. Le cœur du produit, c'est la gestion : biens, logements, locataires, contrats, paiements, réparations, messagerie et documents."
  },
  {
    question: "Qui peut utiliser la plateforme aujourd'hui ?",
    answer:
      "L'espace web sert d'abord aux bailleurs et gestionnaires immobiliers. Les locataires utilisent l'expérience mobile, et la visibilité propriétaire en lecture seule est prévue ensuite."
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


export const MARKETPLACE_PREVIEW_LIMIT = 8;
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
