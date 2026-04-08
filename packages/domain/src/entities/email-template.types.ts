export type EmailTemplateScenario = "welcome_letter" | "house_rules" | "lease_draft" | "general";

export interface EmailTemplate {
  id: string;
  organizationId: string;
  name: string;
  scenario: EmailTemplateScenario;
  subject: string;
  body: string;
  createdByUserId: string;
  updatedByUserId: string;
  createdAtIso: string;
  updatedAtIso: string;
}