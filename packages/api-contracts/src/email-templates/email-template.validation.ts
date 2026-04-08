import { z } from "zod";

export const emailTemplateScenarioSchema = z.enum(["welcome_letter", "house_rules", "lease_draft", "general"]);

export const createEmailTemplateInputSchema = z.object({
  organizationId: z.string().min(1),
  name: z.string().min(1),
  scenario: emailTemplateScenarioSchema,
  subject: z.string().min(1),
  body: z.string().min(1)
});

export const updateEmailTemplateInputSchema = createEmailTemplateInputSchema;

export const sendManagedEmailInputSchema = z.object({
  organizationId: z.string().min(1),
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  documentIds: z.array(z.string().min(1)).optional()
});