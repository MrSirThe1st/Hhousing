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
    title: "Exploitation",
    description: "Tout ce qu'il faut pour piloter le quotidien locatif sans changer d'outil.",
    items: ["Baux et entrées", "Suivi des paiements", "Maintenance", "Documents continus"]
  },
  {
    title: "Communication",
    description: "Gardez les échanges publics et opérationnels dans le même circuit.",
    items: ["Messagerie locataire", "Candidatures publiques", "Invitations d'équipe", "Pages d'annonces partageables"]
  },
  {
    title: "Portefeuille",
    description: "Vision claire des biens, des unités et des performances du parc.",
    items: ["Biens et unités", "Visibilité de l'occupation", "Clients propriétaires", "Bascule de périmètre opérateur"]
  }
] as const;

export const USE_CASES = [
  {
    title: "Gestionnaire immobilier",
    description: "Pilotez plusieurs immeubles, les candidatures, les loyers, la maintenance et la communication depuis un seul espace." 
  },
  {
    title: "Propriétaire bailleur",
    description: "Gérez votre propre parc, vos baux, vos encaissements et vos locataires sans multiplier les fichiers et les outils." 
  },
  {
    title: "Locataire",
    description: "Candidatez publiquement puis retrouvez ensuite votre bail, vos paiements, vos documents, vos demandes et vos messages dans l'app mobile." 
  },
  {
    title: "Propriétaire investisseur",
    description: "Préparez une visibilité lecture seule sur l'occupation, les revenus et la performance du portefeuille géré." 
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
      "La grille ci-dessous reste indicative pour l'instant. Elle prépare déjà l'ajout futur d'offres, de modules monétisés et de promotion payante sans refaire toute la page."
  }
] as const;

export const PRICING_TIERS = [
  {
    name: "Essentiel",
    price: "Sur devis",
    description: "Pour démarrer un premier portefeuille avec les flux locatifs de base.",
    features: ["Biens et unités", "Baux et locataires", "Publication simple des annonces"]
  },
  {
    name: "Équipe",
    price: "Sur devis",
    description: "Pour les opérateurs actifs qui coordonnent plusieurs workflows au quotidien.",
    features: ["Paiements", "Maintenance", "Gestion d'équipe"]
  },
  {
    name: "Portefeuille",
    price: "Sur devis",
    description: "Pour les structures qui pilotent plusieurs équipes, plusieurs parcs et plus de reporting.",
    features: ["Structure multi-opérateurs", "Support renforcé", "Visibilité propriétaire à venir"]
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