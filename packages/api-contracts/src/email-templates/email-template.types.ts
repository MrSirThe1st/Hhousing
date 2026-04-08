import type { EmailTemplate, EmailTemplateScenario } from "@hhousing/domain";

export type EmailTemplateSource = "builtin" | "custom";

export interface EmailTemplateView {
  id: string;
  name: string;
  scenario: EmailTemplateScenario;
  subject: string;
  body: string;
  source: EmailTemplateSource;
  createdAtIso: string | null;
  updatedAtIso: string | null;
}

export interface CreateEmailTemplateInput {
  organizationId: string;
  name: string;
  scenario: EmailTemplateScenario;
  subject: string;
  body: string;
}

export type CreateEmailTemplateOutput = EmailTemplate;

export interface UpdateEmailTemplateInput {
  organizationId: string;
  name: string;
  scenario: EmailTemplateScenario;
  subject: string;
  body: string;
}

export type UpdateEmailTemplateOutput = EmailTemplate;

export interface ListEmailTemplatesOutput {
  templates: EmailTemplateView[];
}

export interface DeleteEmailTemplateOutput {
  success: boolean;
}

export interface SendManagedEmailInput {
  organizationId: string;
  to: string;
  subject: string;
  body: string;
  documentIds?: string[];
}

export interface SendManagedEmailOutput {
  success: boolean;
}