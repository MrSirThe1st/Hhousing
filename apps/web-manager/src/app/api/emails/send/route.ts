import { Permission, sendManagedEmailInputSchema } from "@hhousing/api-contracts";
import { extractAuthSessionFromCookies } from "../../../../auth/session-adapter";
import { requirePermission } from "../../../../api/organizations/permissions";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../../../../api/shared";
import { sendDocumentCommunication } from "../../../../lib/notifications/document-communication";
import {
  resolveDocumentCommunicationPropertyLabel,
  resolveDocumentCommunicationTenant
} from "../../../../lib/notifications/document-communication-context";
import { resolveLeaseDocumentsLink } from "../../../../lib/whatsapp/lease-documents";
import { getScopedPortfolioData, isDocumentAttachmentInScope } from "../../../../lib/operator-scope-portfolio";
import { createDocumentRepo, createId, createRepositoryFromEnv, createTeamFunctionsRepo, createTenantLeaseRepo, jsonResponse, parseJsonBody } from "../../shared";

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
    const tenantLeaseRepository = createTenantLeaseRepo();
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
    const organizationRepositoryResult = createRepositoryFromEnv();
    const organization = organizationRepositoryResult.success
      ? await organizationRepositoryResult.data.getOrganizationById(access.data.organizationId)
      : null;

    const lease = parsed.data.leaseId
      ? await tenantLeaseRepository.getLeaseById(parsed.data.leaseId, access.data.organizationId)
      : null;
    if (parsed.data.leaseId && (!lease || !scopedPortfolio.leaseIds.has(parsed.data.leaseId))) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Lease not found"
      });
    }

    const tenant = parsed.data.tenantId
      ? await tenantLeaseRepository.getTenantById(parsed.data.tenantId, access.data.organizationId)
      : lease
        ? await tenantLeaseRepository.getTenantById(lease.tenantId, access.data.organizationId)
        : null;
    if (parsed.data.tenantId && !tenant) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Tenant not found"
      });
    }

    const tenantContext = resolveDocumentCommunicationTenant({
      tenant,
      lease,
      recipientEmail: parsed.data.to
    });
    const propertyLabel = resolveDocumentCommunicationPropertyLabel({
      lease,
      properties: scopedPortfolio.properties
    });
    const documentsLink = resolveLeaseDocumentsLink(attachments) ?? "";

    const notifications = await sendDocumentCommunication({
      organizationId: access.data.organizationId,
      tenantId: tenantContext.tenantId,
      tenantEmail: parsed.data.to,
      tenantPhone: tenantContext.tenantPhone,
      tenantWhatsappNumber: tenantContext.tenantWhatsappNumber,
      tenantWhatsappOptIn: tenantContext.tenantWhatsappOptIn,
      tenantFullName: tenantContext.tenantFullName,
      organizationName: organization?.name ?? "Haraka Property",
      propertyLabel,
      documentsLink,
      emailSubject: parsed.data.subject,
      emailBody: parsed.data.body,
      organization,
      attachments,
      createMessageId: createId
    });

    const emailDelivery = notifications.find((notification) => notification.channel === "email");
    if (emailDelivery?.status === "failed") {
      throw new Error(emailDelivery.error ?? "EMAIL_SEND_FAILED");
    }

    return jsonResponse(200, {
      success: true,
      data: {
        success: true,
        notifications
      }
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
