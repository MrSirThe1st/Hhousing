import type {
  ApiResult,
  AuthSession,
  CreateDocumentOutput,
  ListDocumentsOutput,
  DeleteDocumentOutput
} from "@hhousing/api-contracts";
import {
  Permission,
  createDocumentInputSchema,
  listDocumentsFilterSchema,
  deleteDocumentInputSchema
} from "@hhousing/api-contracts";
import type { DocumentRepository } from "@hhousing/data-access";
import { requirePermission, type TeamPermissionRepository } from "../organizations/permissions";
import { logOperatorAuditEvent } from "../audit-log";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../shared";

export interface CreateDocumentRequest {
  body: unknown;
  session: AuthSession | null;
}

export interface CreateDocumentResponse {
  status: number;
  body: ApiResult<CreateDocumentOutput>;
}

export interface CreateDocumentDeps {
  repository: DocumentRepository;
  teamFunctionsRepository: TeamPermissionRepository;
  createId: () => string;
}

export async function createDocument(
  request: CreateDocumentRequest,
  deps: CreateDocumentDeps
): Promise<CreateDocumentResponse> {
  const sessionResult = requireOperatorSession(request.session);
  if (!sessionResult.success) {
    return { status: mapErrorCodeToHttpStatus(sessionResult.code), body: sessionResult };
  }

  const permissionResult = await requirePermission(
    sessionResult.data,
    Permission.UPLOAD_DOCUMENTS,
    deps.teamFunctionsRepository,
    true
  );
  if (!permissionResult.success) {
    return { status: mapErrorCodeToHttpStatus(permissionResult.code), body: permissionResult };
  }

  const parsed = createDocumentInputSchema.safeParse(request.body);
  if (!parsed.success) {
    return {
      status: 400,
      body: { success: false, code: "VALIDATION_ERROR", error: parsed.error.message }
    };
  }

  if (parsed.data.organizationId !== sessionResult.data.organizationId) {
    return {
      status: 403,
      body: { success: false, code: "FORBIDDEN", error: "Organization mismatch" }
    };
  }

  const document = await deps.repository.createDocument({
    id: deps.createId(),
    organizationId: parsed.data.organizationId,
    fileName: parsed.data.fileName,
    fileUrl: parsed.data.fileUrl,
    fileSize: parsed.data.fileSize,
    mimeType: parsed.data.mimeType,
    documentType: parsed.data.documentType,
    attachmentType: parsed.data.attachmentType ?? null,
    attachmentId: parsed.data.attachmentId ?? null,
    uploadedBy: sessionResult.data.userId
  });

  await logOperatorAuditEvent({
    organizationId: sessionResult.data.organizationId,
    actorMemberId: sessionResult.data.memberships.find((membership) => membership.organizationId === sessionResult.data.organizationId)?.id ?? null,
    actionKey: "operations.document.uploaded",
    entityType: "document",
    entityId: document.id,
    metadata: {
      documentType: document.documentType,
      attachmentType: document.attachmentType,
      attachmentId: document.attachmentId
    }
  });

  return { status: 201, body: { success: true, data: document } };
}

export interface ListDocumentsRequest {
  organizationId: string | null;
  attachmentType: string | null;
  attachmentId: string | null;
  documentType: string | null;
  session: AuthSession | null;
}

export interface ListDocumentsResponse {
  status: number;
  body: ApiResult<ListDocumentsOutput>;
}

export interface ListDocumentsDeps {
  repository: DocumentRepository;
  teamFunctionsRepository: TeamPermissionRepository;
}

export async function listDocuments(
  request: ListDocumentsRequest,
  deps: ListDocumentsDeps
): Promise<ListDocumentsResponse> {
  const sessionResult = requireOperatorSession(request.session);
  if (!sessionResult.success) {
    return { status: mapErrorCodeToHttpStatus(sessionResult.code), body: sessionResult };
  }

  const organizationId = request.organizationId ?? sessionResult.data.organizationId ?? "";

  if (organizationId !== sessionResult.data.organizationId) {
    return {
      status: 403,
      body: { success: false, code: "FORBIDDEN", error: "Organization mismatch" }
    };
  }

  const permissionResult = await requirePermission(
    sessionResult.data,
    Permission.VIEW_DOCUMENTS,
    deps.teamFunctionsRepository
  );
  if (!permissionResult.success) {
    return { status: mapErrorCodeToHttpStatus(permissionResult.code), body: permissionResult };
  }

  const parsed = listDocumentsFilterSchema.safeParse({
    organizationId,
    attachmentType: request.attachmentType ?? undefined,
    attachmentId: request.attachmentId ?? undefined,
    documentType: request.documentType ?? undefined
  });

  if (!parsed.success) {
    return {
      status: 400,
      body: { success: false, code: "VALIDATION_ERROR", error: parsed.error.message }
    };
  }

  const documents = await deps.repository.listDocuments(parsed.data);

  return { status: 200, body: { success: true, data: { documents } } };
}

export interface DeleteDocumentRequest {
  documentId: string;
  session: AuthSession | null;
}

export interface DeleteDocumentResponse {
  status: number;
  body: ApiResult<DeleteDocumentOutput>;
}

export interface DeleteDocumentDeps {
  repository: DocumentRepository;
  teamFunctionsRepository: TeamPermissionRepository;
}

export async function deleteDocument(
  request: DeleteDocumentRequest,
  deps: DeleteDocumentDeps
): Promise<DeleteDocumentResponse> {
  const sessionResult = requireOperatorSession(request.session);
  if (!sessionResult.success) {
    return { status: mapErrorCodeToHttpStatus(sessionResult.code), body: sessionResult };
  }

  const permissionResult = await requirePermission(
    sessionResult.data,
    Permission.UPLOAD_DOCUMENTS,
    deps.teamFunctionsRepository,
    true
  );
  if (!permissionResult.success) {
    return { status: mapErrorCodeToHttpStatus(permissionResult.code), body: permissionResult };
  }

  const organizationId = sessionResult.data.organizationId ?? "";

  const parsed = deleteDocumentInputSchema.safeParse({
    documentId: request.documentId,
    organizationId
  });

  if (!parsed.success) {
    return {
      status: 400,
      body: { success: false, code: "VALIDATION_ERROR", error: parsed.error.message }
    };
  }

  await deps.repository.deleteDocument(parsed.data.documentId, parsed.data.organizationId);

  await logOperatorAuditEvent({
    organizationId: sessionResult.data.organizationId,
    actorMemberId: sessionResult.data.memberships.find((membership) => membership.organizationId === sessionResult.data.organizationId)?.id ?? null,
    actionKey: "operations.document.deleted",
    entityType: "document",
    entityId: parsed.data.documentId,
    metadata: {}
  });

  return { status: 200, body: { success: true, data: { success: true } } };
}
