import type { PublicListingFilter } from "@hhousing/api-contracts";

export type PublicMarketplaceSearchParams = {
  q?: string;
  city?: string;
  minRent?: string;
  maxRent?: string;
  propertyType?: string;
};

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
      "La grille ci-dessous présente nos offres. Nous proposons un tarif clair et transparent de 5$ par logement et par mois pour les professionnels de la gestion immobilière."
  }
] as const;

export const PRICING_TIERS = [
  {
    name: "Professionnel",
    price: "5$ / logement / mois",
    description: "Tarif simple, transparent et sans engagement pour tous les gestionnaires immobiliers et bailleurs.",
    features: ["Logements illimités", "Suivi automatisé des paiements", "Gestion complète des réparations", "Invitations d'équipe"]
  }
] as const;


export const MARKETPLACE_PREVIEW_LIMIT = 8;

export function parseOptionalNumber(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function buildPublicListingFilter(params?: PublicMarketplaceSearchParams): PublicListingFilter {
  return {
    q: params?.q?.trim() || null,
    city: params?.city?.trim() || null,
    minRent: parseOptionalNumber(params?.minRent),
    maxRent: parseOptionalNumber(params?.maxRent),
    propertyType:
      params?.propertyType === "single_unit" || params?.propertyType === "multi_unit"
        ? params.propertyType
        : null,
    featuredOnly: false
  };
}
