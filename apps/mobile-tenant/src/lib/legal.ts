export const LEGAL_SITE_BASE_URL = "https://www.harakaproperty.com";

export const LEGAL_URLS = {
  privacy: `${LEGAL_SITE_BASE_URL}/politique-de-confidentialite`,
  terms: `${LEGAL_SITE_BASE_URL}/conditions-utilisation`,
  support: `${LEGAL_SITE_BASE_URL}/support`,
  dataDeletion: `${LEGAL_SITE_BASE_URL}/suppression-donnees`
} as const;

/** Tawk.to ticket forwarding inbox — use for product support mailto links. */
export const SUPPORT_EMAIL = "tickets@haraka.p.tawk.email";
