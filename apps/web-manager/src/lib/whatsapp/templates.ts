export type WhatsAppTemplateLanguageCode = "en_US" | "fr";

export interface WhatsAppTemplateDefinition {
  name: string;
  languageCode: WhatsAppTemplateLanguageCode;
  bodyParameterCount: number;
}

export const WHATSAPP_TEST_TEMPLATE: WhatsAppTemplateDefinition = {
  name: "jaspers_market_order_confirmation_v1",
  languageCode: "en_US",
  bodyParameterCount: 3
};

export const WHATSAPP_TENANT_INVITATION_TEMPLATE: WhatsAppTemplateDefinition = {
  name: "tenant_invitation_v1",
  languageCode: "fr",
  bodyParameterCount: 3
};

export const WHATSAPP_TEMPLATES = {
  testOrderConfirmation: WHATSAPP_TEST_TEMPLATE,
  tenantInvitation: WHATSAPP_TENANT_INVITATION_TEMPLATE,
  leaseDocuments: {
    name: "lease_documents_v1",
    languageCode: "fr" as const,
    bodyParameterCount: 4
  },
  paymentConfirmation: {
    name: "payment_confirmation_v1",
    languageCode: "fr" as const,
    bodyParameterCount: 5
  }
} as const;

export type WhatsAppTemplateKey = keyof typeof WHATSAPP_TEMPLATES;

export function getTenantInvitationTemplateFromEnv(): WhatsAppTemplateDefinition | null {
  const templateName = process.env.WHATSAPP_TENANT_INVITATION_TEMPLATE?.trim();
  if (!templateName) {
    return null;
  }

  const configuredLanguage = process.env.WHATSAPP_TENANT_INVITATION_TEMPLATE_LANGUAGE?.trim();
  const languageCode = normalizeWhatsAppTemplateLanguage(configuredLanguage);

  return {
    name: templateName,
    languageCode,
    bodyParameterCount: 3
  };
}

function normalizeWhatsAppTemplateLanguage(languageCode: string | undefined): WhatsAppTemplateLanguageCode {
  if (!languageCode) {
    return "fr";
  }

  if (languageCode === "en_US" || languageCode.startsWith("en")) {
    return "en_US";
  }

  return "fr";
}

export function getLeaseDocumentsTemplateFromEnv(): WhatsAppTemplateDefinition | null {
  const templateName = process.env.WHATSAPP_LEASE_DOCUMENTS_TEMPLATE?.trim();
  if (!templateName) {
    return null;
  }

  const configuredLanguage = process.env.WHATSAPP_LEASE_DOCUMENTS_TEMPLATE_LANGUAGE?.trim();
  const languageCode = normalizeWhatsAppTemplateLanguage(configuredLanguage);

  return {
    name: templateName,
    languageCode,
    bodyParameterCount: 4
  };
}

export function getPaymentConfirmationTemplateFromEnv(): WhatsAppTemplateDefinition | null {
  const templateName = process.env.WHATSAPP_PAYMENT_CONFIRMATION_TEMPLATE?.trim();
  if (!templateName) {
    return null;
  }

  const configuredLanguage = process.env.WHATSAPP_PAYMENT_CONFIRMATION_TEMPLATE_LANGUAGE?.trim();
  const languageCode = normalizeWhatsAppTemplateLanguage(configuredLanguage);

  return {
    name: templateName,
    languageCode,
    bodyParameterCount: 5
  };
}
