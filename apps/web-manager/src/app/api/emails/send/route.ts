import { Permission, sendManagedEmailInputSchema } from "@hhousing/api-contracts";
import { extractAuthSessionFromCookies } from "../../../../auth/session-adapter";
import { requirePermission } from "../../../../api/organizations/permissions";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../../../../api/shared";
import { sendManagedEmailFromEnv } from "../../../../lib/email/resend";
import { getScopedPortfolioData, isDocumentAttachmentInScope } from "../../../../lib/operator-scope-portfolio";
import { createDocumentRepo, createRepositoryFromEnv, createTeamFunctionsRepo, jsonResponse, parseJsonBody } from "../../shared";

function mapSendEmailError(error: unknown): { status: number; body: { success: false; code: string; error: string } } {
  if (error instanceof Error && error.message === "RESEND_EMAIL_NOT_CONFIGURED") {
    return {
      status: 400,
      body: {
        success: false,
        code: "VALIDATION_ERROR",
        error: "L'envoi d'email n'est pas configuré pour cet environnement"
      }
    };
  }

  if (error instanceof Error && error.message.startsWith("EMAIL_ATTACHMENT_FETCH_FAILED")) {
    return {
      status: 400,
      body: {
        success: false,
        code: "VALIDATION_ERROR",
        error: "Au moins une pièce jointe ne peut pas être téléchargée"
      }
    };
  }

  return {
    status: 500,
    body: {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to send email"
    }
  };
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

  const parsed = sendManagedEmailInputSchema.safeParse(body);
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

  try {
    const scopedPortfolio = await getScopedPortfolioData(access.data);
    const documentRepository = createDocumentRepo();
    const organizationRepositoryResult = createRepositoryFromEnv();
    const attachments = parsed.data.documentIds
      ? await Promise.all(
          parsed.data.documentIds.map(async (documentId) => {
            const document = await documentRepository.getDocumentById(documentId, access.data.organizationId);
            if (!document || !isDocumentAttachmentInScope(document.attachmentType, document.attachmentId, scopedPortfolio)) {
              throw new Error("EMAIL_DOCUMENT_NOT_FOUND");
            }

            return {
              fileName: document.fileName,
              mimeType: document.mimeType,
              fileUrl: document.fileUrl
            };
          })
        )
      : [];
    const organization = organizationRepositoryResult.success
      ? await organizationRepositoryResult.data.getOrganizationById(access.data.organizationId)
      : null;

    await sendManagedEmailFromEnv({
      to: parsed.data.to,
      subject: parsed.data.subject,
      body: parsed.data.body,
      organization,
      attachments
    });

    return jsonResponse(200, {
      success: true,
      data: { success: true }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_DOCUMENT_NOT_FOUND") {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Document not found"
      });
    }

    const mappedError = mapSendEmailError(error);
    return jsonResponse(mappedError.status, mappedError.body);
  }
}