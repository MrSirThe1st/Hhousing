import { Permission, updateEmailTemplateInputSchema } from "@hhousing/api-contracts";
import { extractAuthSessionFromCookies } from "../../../../auth/session-adapter";
import { requirePermission } from "../../../../api/organizations/permissions";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../../../../api/shared";
import { createEmailTemplateRepo, createTeamFunctionsRepo, jsonResponse, parseJsonBody } from "../../shared";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
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

  const parsed = updateEmailTemplateInputSchema.safeParse(body);
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

  const template = await createEmailTemplateRepo().updateEmailTemplate({
    id,
    organizationId: parsed.data.organizationId,
    name: parsed.data.name,
    scenario: parsed.data.scenario,
    subject: parsed.data.subject,
    body: parsed.data.body,
    updatedByUserId: access.data.userId
  });

  if (!template) {
    return jsonResponse(404, {
      success: false,
      code: "NOT_FOUND",
      error: "Template not found"
    });
  }

  return jsonResponse(200, {
    success: true,
    data: template
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
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

  const repository = createEmailTemplateRepo();
  const existing = await repository.getEmailTemplateById(id, access.data.organizationId);
  if (!existing) {
    return jsonResponse(404, {
      success: false,
      code: "NOT_FOUND",
      error: "Template not found"
    });
  }

  await repository.deleteEmailTemplate(id, access.data.organizationId);

  return jsonResponse(200, {
    success: true,
    data: { success: true }
  });
}