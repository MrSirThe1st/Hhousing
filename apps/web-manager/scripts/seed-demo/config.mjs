/** Demo seed configuration — kept small enough for usable remote-dev dashboards. */

export const SEED_PASSWORD = "DemoSeed123!";
export const SEED_EMAIL_DOMAIN = "seed.demo";
export const SEED_ID_PREFIX = "seed_";
export const SEED_MARKER = "Hhousing demo seed — do not use in production";

export const VOLUME = {
  orgs: 3,
  /** Total properties across all seed orgs (~9 / 5 / 4). */
  properties: 18,
  /** ~6–7 units per property on average. */
  unitsTarget: 120,
  /** Occupied leases + a light prospect pool — not thousands. */
  tenantsTarget: 110,
  occupancyRate: 0.8,
  landlords: 5,
  propertyManagers: 5,
  staff: 8,
  prestataires: 12,
  expensesPerOrg: 20,
  /** Months of rent history for active leases (spread realism). */
  paymentHistoryMonths: 4,
  /** Share of occupied units that get a conversation. */
  conversationRate: 0.2,
  messagesPerConversation: [2, 5],
  documentsPerActiveLeaseChance: 0.35,
  /** Share of vacant units on active properties that get a published listing. */
  listingPublishRate: 0.4,
  /** Additional share of remaining vacant units that get a draft listing. */
  listingDraftRate: 0.1,
  /** Share of published listings marked featured. */
  featuredListingRate: 0.15,
  /** Chance a published listing receives at least one application. */
  listingApplicationChance: 0.4
};

export const LISTING_DESCRIPTIONS = [
  "Bel appartement lumineux, idéal pour famille ou jeunes professionnels. Quartier calme et sécurisé.",
  "Unité récemment rénovée avec finitions modernes. Proche des commerces et transports.",
  "Spacieux et bien ventilé. Eau et électricité stables. Disponible immédiatement.",
  "Cadre agréable avec bons accès. Cuisine équipée et espace de vie confortable.",
  "Logement prêt à habiter, bien entretenu. Visites sur rendez-vous.",
  "Emplacement stratégique, voisinage résidentiel. Parfait pour un couple ou une petite famille.",
  "Appartement fonctionnel avec bonnes proportions. Sécurité et accès faciles.",
  "Bien situé, calme, et adapté au télétravail. Climatisation possible selon unité."
];

/**
 * Curated Unsplash photo IDs (houses / apartments / interiors).
 * Used instead of picsum so catalogue images look like logements.
 */
export const PROPERTY_PHOTO_IDS = [
  "1560448204-e02f11c3d0e2",
  "1522708323590-d24dbb6b0267",
  "1502672260266-1c1ef2d93688",
  "1493809842364-78817add7ffb",
  "1484154218962-a197022b5858",
  "1505693416388-ac5ce068fe85",
  "1564013799919-ab600027ffc6",
  "1600596542815-ffad4c1539a9",
  "1600585154340-be6161a56a0c",
  "1600607687939-ce8a6c25118c",
  "1600566753190-17f0baa2a6c3",
  "1512917774080-9991f1c4c750",
  "1570129477492-45c003edd2be",
  "1580587771525-78b9dba3b914",
  "1449844908441-8829872d2607",
  "1554995207-c18c203602cb",
  "1560185127-6ed189bf02f4",
  "1568605114967-8130f3a36994",
  "1613490493576-7fde63acd811",
  "1605276374104-dee2a0ed3cd6",
  "1600210492486-724fe5c67fb0",
  "1600047509358-9dc435629748",
  "1600047509807-ba8f99d2cdde",
  "1497366216548-37526070297c",
  "1497366754035-f200968a6e72",
  "1560184897-ae75f4148760",
  "1560448204-603b3fc33ddc",
  "1598928506311-c55ded91a20c",
  "1616594039964-ae9021a400a0",
  "1618221195710-dd6b41faaea6",
  "1616486338812-3dadae4b4ace",
  "1631679706909-1844bbd07221",
  "1661956602119-aa517be6d1d3",
  "1600585154526-990dced4db0d",
  "1600573472591-ee6981cf7426",
  "1600047508618-e987f9b2c8c4"
];

export const CITIES = [
  {
    name: "Kinshasa",
    province: "Kinshasa",
    quartiers: [
      "Gombe",
      "Lingwala",
      "Kinshasa",
      "Barumbu",
      "Kalamu",
      "Limete",
      "Ngaliema",
      "Lemba",
      "Masina",
      "Ndjili"
    ]
  },
  {
    name: "Lubumbashi",
    province: "Haut-Katanga",
    quartiers: ["Centre-ville", "Kenya", "Kampemba", "Annexe", "Lubumbashi", "Katuba"]
  },
  {
    name: "Kolwezi",
    province: "Lualaba",
    quartiers: ["Dilala", "Manika", "Kanina", "Centre"]
  }
];

export const CURRENCIES = ["USD", "CDF"];

export const ORG_PROFILES = [
  {
    key: "01",
    name: "Seed Gestion Immobilière Kinshasa",
    experience: "entreprise",
    city: "Kinshasa",
    propertyShare: 0.5,
    landlordCount: 2,
    pmCount: 2,
    staffCount: 4
  },
  {
    key: "02",
    name: "Seed Habitat Lubumbashi SARL",
    experience: "entreprise",
    city: "Lubumbashi",
    propertyShare: 0.3,
    landlordCount: 2,
    pmCount: 2,
    staffCount: 2
  },
  {
    key: "03",
    name: "Seed Residences Kolwezi",
    experience: "individual",
    city: "Kolwezi",
    propertyShare: 0.2,
    landlordCount: 1,
    pmCount: 1,
    staffCount: 2
  }
];

/** Loginable accounts — created in Supabase Auth. */
export const LOGINABLE = {
  admin: { email: `admin@${SEED_EMAIL_DOMAIN}`, fullName: "Admin Seed Demo", role: "platform_admin" },
  operators: [
    {
      email: `landlord1@${SEED_EMAIL_DOMAIN}`,
      fullName: "Jean-Pierre Mbala",
      role: "landlord",
      orgKey: "01",
      canOwnProperties: true
    },
    {
      email: `pm1@${SEED_EMAIL_DOMAIN}`,
      fullName: "Grace Kalala",
      role: "property_manager",
      orgKey: "01",
      canOwnProperties: true
    },
    {
      email: `pm2@${SEED_EMAIL_DOMAIN}`,
      fullName: "Patrick Mutombo",
      role: "property_manager",
      orgKey: "02",
      canOwnProperties: false
    }
  ],
  tenants: Array.from({ length: 8 }, (_, i) => ({
    email: `tenant${i + 1}@${SEED_EMAIL_DOMAIN}`,
    fullName: null, // filled at runtime with French name
    index: i
  })),
  owners: [
    { email: `owner1@${SEED_EMAIL_DOMAIN}`, fullName: "Claire Tshibangu", orgKey: "01" },
    { email: `owner2@${SEED_EMAIL_DOMAIN}`, fullName: "Michel Kabongo", orgKey: "02" }
  ]
};

export const TEAM_FUNCTIONS = [
  {
    code: "LEASING_AGENT",
    display_name: "Agent de location",
    description: "Gère les baux et la communication locataires",
    permissions: [
      "view_properties",
      "create_lease",
      "edit_lease",
      "view_lease",
      "manage_tenants",
      "view_tenants",
      "message_tenants",
      "view_documents",
      "upload_documents"
    ]
  },
  {
    code: "ACCOUNTANT",
    display_name: "Comptable",
    description: "Gère les finances et rapports",
    permissions: [
      "view_lease",
      "view_payments",
      "record_payment",
      "export_payment_reports",
      "view_documents",
      "view_income_reports"
    ]
  },
  {
    code: "ADMIN",
    display_name: "Admin (interne)",
    description: "Accès complet dans l'organisation",
    permissions: ["*"]
  }
];

export const SP_CATEGORIES = [
  "spc_plomberie",
  "spc_electricite",
  "spc_securite",
  "spc_automatisme",
  "spc_peinture",
  "spc_autre"
];

export const MESSAGE_SNIPPETS = [
  "Bonjour, j'aimerais confirmer la date de visite pour le bien.",
  "Le paiement du loyer a bien été effectué hier via mobile money.",
  "Merci pour votre retour rapide.",
  "Y a-t-il une mise à jour concernant ma demande ?",
  "Nous passons demain entre 9h et 11h.",
  "Pouvez-vous envoyer le reçu du mois dernier ?",
  "D'accord, je serai disponible l'après-midi.",
  "Le technicien est passé, tout fonctionne à nouveau.",
  "Merci beaucoup pour votre assistance.",
  "Je confirme la réception des documents."
];

export const AMENITIES = [
  "climatisation",
  "groupe_electrogene",
  "parking",
  "gardiennage",
  "eau_courante",
  "cuisine_equipee",
  "balcon",
  "terrasse",
  "wifi"
];
