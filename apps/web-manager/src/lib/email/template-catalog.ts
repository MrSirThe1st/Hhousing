import type { EmailTemplateScenario } from "@hhousing/domain";
import type { EmailTemplateView } from "@hhousing/api-contracts";
import type { LeaseWithTenantView, PropertyWithUnitsView } from "@hhousing/api-contracts";
import type { Organization, Tenant, Unit } from "@hhousing/domain";

export interface EmailTemplateRenderContext {
  organization: Organization | null;
  property: PropertyWithUnitsView["property"] | null;
  unit: Unit | null;
  lease: LeaseWithTenantView | null;
  tenant: Tenant | null;
  today: string;
}

export const BUILTIN_EMAIL_TEMPLATES: EmailTemplateView[] = [
  {
    id: "builtin:lease_draft",
    name: "Envoi du bail",
    scenario: "lease_draft",
    subject: "Votre bail pour {{property_name}}",
    body:
      "Bonjour {{tenant_name}},\n\nVeuillez trouver ci-joint votre bail et les documents liés à votre location pour {{property_name}} - unité {{unit_number}}.\n\nDate de début: {{lease_start_date}}\nDate de fin: {{lease_end_date}}\nLoyer: {{monthly_rent}} {{currency}}\n\nMerci de vérifier les documents et de revenir vers nous si vous avez des questions.\n\nCordialement,\nL'équipe de gestion",
    source: "builtin",
    createdAtIso: null,
    updatedAtIso: null
  },
  {
    id: "builtin:welcome_letter",
    name: "Lettre de bienvenue",
    scenario: "welcome_letter",
    subject: "Bienvenue à {{property_name}}",
    body:
      "Bonjour {{tenant_name}},\n\nBienvenue dans votre nouveau logement à {{property_name}}. Nous sommes heureux de vous compter parmi nos locataires.\n\nDate du jour: {{today}}\nDate de début du bail: {{lease_start_date}}\n\nN'hésitez pas à nous contacter pour toute question.\n\nCordialement,\nL'équipe de gestion",
    source: "builtin",
    createdAtIso: null,
    updatedAtIso: null
  },
  {
    id: "builtin:house_rules",
    name: "Règlement intérieur",
    scenario: "house_rules",
    subject: "Règlement intérieur - {{property_name}}",
    body:
      "Bonjour {{tenant_name}},\n\nVeuillez trouver ci-joint le règlement intérieur applicable à votre logement à {{property_name}}.\n\nMerci d'en prendre connaissance attentivement.\n\nCordialement,\nL'équipe de gestion",
    source: "builtin",
    createdAtIso: null,
    updatedAtIso: null
  }
];

function formatCurrency(value: number | null, currency: string | null): string {
  if (value === null || currency === null) {
    return "";
  }

  return value.toLocaleString("fr-FR");
}

function getPlaceholderMap(context: EmailTemplateRenderContext): Record<string, string> {
  return {
    today: context.today,
    tenant_name: context.tenant?.fullName ?? context.lease?.tenantFullName ?? "",
    tenant_email: context.tenant?.email ?? context.lease?.tenantEmail ?? "",
    organization_name: context.organization?.name ?? "",
    organization_contact_email: context.organization?.contactEmail ?? "",
    organization_contact_phone: context.organization?.contactPhone ?? "",
    organization_whatsapp: context.organization?.contactWhatsapp ?? "",
    organization_website: context.organization?.websiteUrl ?? "",
    organization_address: context.organization?.address ?? "",
    organization_email_signature: context.organization?.emailSignature ?? "",
    organization_logo_url: context.organization?.logoUrl ?? "",
    property_name: context.property?.name ?? "",
    property_address: context.property?.address ?? "",
    property_city: context.property?.city ?? "",
    unit_number: context.unit?.unitNumber ?? "",
    lease_start_date: context.lease?.startDate ?? "",
    lease_end_date: context.lease?.endDate ?? "Ouvert",
    monthly_rent: formatCurrency(context.lease?.monthlyRentAmount ?? context.unit?.monthlyRentAmount ?? null, context.lease?.currencyCode ?? context.unit?.currencyCode ?? null),
    currency: context.lease?.currencyCode ?? context.unit?.currencyCode ?? ""
  };
}

export function renderTemplateText(templateText: string, context: EmailTemplateRenderContext): string {
  const placeholders = getPlaceholderMap(context);

  return Object.entries(placeholders).reduce((accumulator, [key, value]) => {
    return accumulator.replaceAll(`{{${key}}}`, value);
  }, templateText);
}

export function isBuiltinTemplateId(templateId: string): boolean {
  return templateId.startsWith("builtin:");
}

export function getBuiltinTemplateById(templateId: string): EmailTemplateView | null {
  return BUILTIN_EMAIL_TEMPLATES.find((template) => template.id === templateId) ?? null;
}

export function getBuiltinTemplateByScenario(scenario: EmailTemplateScenario): EmailTemplateView | null {
  return BUILTIN_EMAIL_TEMPLATES.find((template) => template.scenario === scenario) ?? null;
}