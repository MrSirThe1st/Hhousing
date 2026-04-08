import { Permission, createEmailTemplateInputSchema, type EmailTemplateView } from "@hhousing/api-contracts";
import { extractAuthSessionFromCookies } from "../../../auth/session-adapter";
import { requirePermission } from "../../../api/organizations/permissions";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../../../api/shared";
import { BUILTIN_EMAIL_TEMPLATES } from "../../../lib/email/template-catalog";
import { createEmailTemplateRepo, createId, createTeamFunctionsRepo, jsonResponse, parseJsonBody } from "../shared";

export async function GET(): Promise<Response> {
  const access = requireOperatorSession(await extractAuthSessionFromCookies());

  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const permissionResult = await requirePermission(
    access.data,
    Permission.MESSAGE_TENANTS,
    createTeamFunctionsRepo()
  );
  if (!permissionResult.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(permissionResult.code), permissionResult);
  }

  const templates = await createEmailTemplateRepo().listEmailTemplates(access.data.organizationId);
  const customTemplates: EmailTemplateView[] = templates.map((template) => ({
    id: template.id,
    name: template.name,
    scenario: template.scenario,
    subject: template.subject,
    body: template.body,
    source: "custom",
    createdAtIso: template.createdAtIso,
    updatedAtIso: template.updatedAtIso
  }));

  return jsonResponse(200, {
    success: true,
    data: {
      templates: [...BUILTIN_EMAIL_TEMPLATES, ...customTemplates]
    }
  });
}

export async function POST(request: Request): Promise<Response> {
  const access = requireOperatorSession(await extractAuthSessionFromCookies());

  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const permissionResult = await requirePermission(
    access.data,
    Permission.MESSAGE_TENANTS,
    createTeamFunctionsRepo()
  );
  if (!permissionResult.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(permissionResult.code), permissionResult);
  }

  let body: unknown;
  try {
    body = await parseJsonBody(request);
  } catch {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: "Body must be valid JSON"
    });
  }

  const parsed = createEmailTemplateInputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: parsed.error.message
    });
  }

  if (parsed.data.organizationId !== access.data.organizationId) {
    return jsonResponse(403, {
      success: false,
      code: "FORBIDDEN",
      error: "Organization mismatch"
    });
  }

  const template = await createEmailTemplateRepo().createEmailTemplate({
    id: createId("tpl"),
    organizationId: parsed.data.organizationId,
    name: parsed.data.name,
    scenario: parsed.data.scenario,
    subject: parsed.data.subject,
    body: parsed.data.body,
    createdByUserId: access.data.userId,
    updatedByUserId: access.data.userId
  });

  return jsonResponse(201, {
    success: true,
    data: template
  });
}