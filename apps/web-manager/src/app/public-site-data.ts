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
    description: "Fini la paperasse et les fichiers Excel complexes. Créez vos baux en quelques clics, suivez l'état des loyers en temps réel et gardez tous vos documents importants (contrats, pièces d'identité) sous la main, accessibles à tout moment.",
    items: ["Création rapide de baux", "Suivi en direct des loyers", "Alertes de maintenance", "Coffre-fort numérique"]
  },
  {
    title: "Des échanges fluides",
    description: "Restez connecté avec vos locataires sans y passer vos soirées. Discutez en direct via la messagerie, recevez les candidatures complètes en ligne avec justificatifs, et planifiez les visites en toute sérénité.",
    items: ["Messagerie intégrée", "Dossiers de candidature en ligne", "Gestion d'équipe à plusieurs", "Partage simple d'annonces"]
  },
  {
    title: "Une vision financière claire",
    description: "Sachez exactement où vous en êtes financièrement. D'un simple coup d'œil sur votre tableau de bord, identifiez les retards de paiement, visualisez le taux d'occupation de vos biens et générez vos rapports financiers.",
    items: ["Suivi par bien et unité", "Indicateurs d'occupation", "Espace de collaboration", "Rapports de comptabilité simples"]
  }
] as const;

export const USE_CASES = [
  {
    title: "Propriétaires indépendants",
    description: "Que vous gériez un petit studio pour arrondir vos fins de mois ou des dizaines d'appartements en ville, suivez vos contrats, encaissez vos loyers et gérez les imprévus sans stress."
  },
  {
    title: "Gestionnaires & Agences",
    description: "Pilotez des portefeuilles complexes de centaines de biens. Centralisez les demandes de vos clients, suivez les flux financiers et coordonnez les équipes sur le terrain depuis un outil unique."
  },
  {
    title: "Recherche résidentielle & commerciale",
    description: "Trouvez votre futur logement (maison, appartement, studio) ou dénichez les locaux parfaits pour votre activité professionnelle (bureaux, boutiques, entrepôts commerciaux)."
  },
  {
    title: "Locataires au quotidien",
    description: "Accédez à toutes vos quittances de loyer au même endroit, signalez instantanément un problème technique (fuite d'eau, panne de chauffage) et communiquez facilement avec votre bailleur."
  }
] as const;

export const FAQS = [
  {
    question: "Haraka Property est-il seulement une marketplace ?",
    answer:
      "Non. La marketplace n'est qu'une couche d'acquisition. Le coeur du produit reste l'exploitation : biens, unités, locataires, baux, paiements, maintenance, messagerie et documents."
  },
  {
    question: "Qui peut utiliser la plateforme aujourd'hui ?",
    answer:
      "L'espace web sert d'abord aux bailleurs et gestionnaires immobiliers. Les locataires utilisent l'expérience mobile, et la visibilité propriétaire lecture seule est prévue ensuite."
  },
  {
    question: "Faut-il publier des annonces pour utiliser Haraka Property ?",
    answer:
      "Non. Vous pouvez gérer tout votre portefeuille en interne sans rien publier. Les annonces restent optionnelles et s'appuient sur les mêmes fiches biens et unités."
  },
  {
    question: "Comment fonctionne la tarification ?",
    answer:
      "La grille ci-dessous présente nos offres. Nous proposons un tarif clair et transparent de 5$ par unité et par mois pour les professionnels de la gestion immobilière."
  }
] as const;

export const PRICING_TIERS = [
  {
    name: "Professionnel",
    price: "5$ / unité / mois",
    description: "Tarif simple, transparent et sans engagement pour tous les gestionnaires immobiliers et propriétaires bailleurs.",
    features: ["Unités illimitées", "Suivi automatisé des paiements", "Gestion complète de la maintenance", "Invitations d'équipe"]
  }
] as const;


export const MARKETPLACE_PREVIEW_LIMIT = 4;

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