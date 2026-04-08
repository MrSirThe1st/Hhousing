import type { EmailTemplate, EmailTemplateScenario } from "@hhousing/domain";

export interface CreateEmailTemplateRecordInput {
  id: string;
  organizationId: string;
  name: string;
  scenario: EmailTemplateScenario;
  subject: string;
  body: string;
  createdByUserId: string;
  updatedByUserId: string;
}

export interface UpdateEmailTemplateRecordInput {
  id: string;
  organizationId: string;
  name: string;
  scenario: EmailTemplateScenario;
  subject: string;
  body: string;
  updatedByUserId: string;
}

export interface EmailTemplateRepository {
  listEmailTemplates(organizationId: string): Promise<EmailTemplate[]>;
  createEmailTemplate(input: CreateEmailTemplateRecordInput): Promise<EmailTemplate>;
  updateEmailTemplate(input: UpdateEmailTemplateRecordInput): Promise<EmailTemplate | null>;
  deleteEmailTemplate(id: string, organizationId: string): Promise<void>;
  getEmailTemplateById(id: string, organizationId: string): Promise<EmailTemplate | null>;
}