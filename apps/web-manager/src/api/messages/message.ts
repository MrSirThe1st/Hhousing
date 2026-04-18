import type {
  ApiResult,
  AuthSession,
  GetManagerConversationDetailOutput,
  GetTenantConversationDetailOutput,
  ListManagerConversationsOutput,
  ListTenantConversationsOutput,
  SendManagerMessageOutput,
  SendTenantMessageOutput,
  StartManagerConversationOutput
} from "@hhousing/api-contracts";
import {
  Permission,
  parseListManagerConversationsFilter,
  parseSendManagerMessageInput,
  parseSendTenantMessageInput,
  parseStartManagerConversationInput
} from "@hhousing/api-contracts";
import type { MessageRepository } from "@hhousing/data-access";
import { logOperatorAuditEvent } from "../audit-log";
import { mapErrorCodeToHttpStatus, requireOperatorSession, requireTenantSession } from "../shared";
import type { TeamPermissionRepository } from "../organizations/permissions";
import { requirePermission } from "../organizations/permissions";

export interface ListManagerConversationsRequest {
  session: AuthSession | null;
  propertyId: string | null;
  q: string | null;
}

export interface ListManagerConversationsResponse {
  status: number;
  body: ApiResult<ListManagerConversationsOutput>;
}

export interface ListManagerConversationsDeps {
  repository: MessageRepository;
  teamFunctionsRepository: TeamPermissionRepository;
}

export async function listManagerConversations(
  request: ListManagerConversationsRequest,
  deps: ListManagerConversationsDeps
): Promise<ListManagerConversationsResponse> {
  const sessionResult = requireOperatorSession(request.session);
  if (!sessionResult.success) {
    return { status: mapErrorCodeToHttpStatus(sessionResult.code), body: sessionResult };
  }

  const permissionResult = await requirePermission(
    sessionResult.data,
    Permission.MESSAGE_TENANTS,
    deps.teamFunctionsRepository
  );
  if (!permissionResult.success) {
    return { status: 403, body: permissionResult };
  }

  const parsed = parseListManagerConversationsFilter(
    {
      propertyId: request.propertyId,
      q: request.q
    },
    sessionResult.data.organizationId
  );

  if (!parsed.success) {
    return { status: mapErrorCodeToHttpStatus(parsed.code), body: parsed };
  }

  const conversations = await deps.repository.listManagerConversations(parsed.data);

  return {
    status: 200,
    body: {
      success: true,
      data: {
        conversations
      }
    }
  };
}

export interface GetManagerConversationDetailRequest {
  session: AuthSession | null;
  conversationId: string;
}

export interface GetManagerConversationDetailResponse {
  status: number;
  body: ApiResult<GetManagerConversationDetailOutput>;
}

export interface GetManagerConversationDetailDeps {
  repository: MessageRepository;
  teamFunctionsRepository: TeamPermissionRepository;
}

export async function getManagerConversationDetail(
  request: GetManagerConversationDetailRequest,
  deps: GetManagerConversationDetailDeps
): Promise<GetManagerConversationDetailResponse> {
  const sessionResult = requireOperatorSession(request.session);
  if (!sessionResult.success) {
    return { status: mapErrorCodeToHttpStatus(sessionResult.code), body: sessionResult };
  }

  const permissionResult = await requirePermission(
    sessionResult.data,
    Permission.MESSAGE_TENANTS,
    deps.teamFunctionsRepository
  );
  if (!permissionResult.success) {
    return { status: 403, body: permissionResult };
  }

  const detail = await deps.repository.getManagerConversationDetail(
    request.conversationId,
    sessionResult.data.organizationId
  );

  if (!detail) {
    return {
      status: 404,
      body: { success: false, code: "NOT_FOUND", error: "Conversation not found" }
    };
  }

  await deps.repository.markManagerConversationRead(
    request.conversationId,
    sessionResult.data.organizationId
  );

  return {
    status: 200,
    body: { success: true, data: detail }
  };
}

export interface StartManagerConversationRequest {
  session: AuthSession | null;
  body: unknown;
}

export interface StartManagerConversationResponse {
  status: number;
  body: ApiResult<StartManagerConversationOutput>;
}

export interface StartManagerConversationDeps {
  repository: MessageRepository;
  createId: (prefix: string) => string;
  teamFunctionsRepository: TeamPermissionRepository;
}

export async function startManagerConversation(
  request: StartManagerConversationRequest,
  deps: StartManagerConversationDeps
): Promise<StartManagerConversationResponse> {
  const sessionResult = requireOperatorSession(request.session);
  if (!sessionResult.success) {
    return { status: mapErrorCodeToHttpStatus(sessionResult.code), body: sessionResult };
  }

  const permissionResult = await requirePermission(
    sessionResult.data,
    Permission.MESSAGE_TENANTS,
    deps.teamFunctionsRepository,
    true
  );
  if (!permissionResult.success) {
    return { status: 403, body: permissionResult };
  }

  const parsed = parseStartManagerConversationInput(
    request.body,
    sessionResult.data.organizationId
  );

  if (!parsed.success) {
    return { status: mapErrorCodeToHttpStatus(parsed.code), body: parsed };
  }

  const conversationId = await deps.repository.startManagerConversation({
    conversationId: deps.createId("conv"),
    messageId: deps.createId("msg"),
    organizationId: parsed.data.organizationId,
    tenantId: parsed.data.tenantId,
    unitId: parsed.data.unitId,
    senderUserId: sessionResult.data.userId,
    body: parsed.data.body
  });

  if (!conversationId) {
    return {
      status: 422,
      body: {
        success: false,
        code: "VALIDATION_ERROR",
        error: "Unable to resolve a valid tenant/unit conversation context"
      }
    };
  }

  await logOperatorAuditEvent({
    organizationId: sessionResult.data.organizationId,
    actorMemberId: sessionResult.data.memberships.find((membership) => membership.organizationId === sessionResult.data.organizationId)?.id ?? null,
    actionKey: "operations.conversation.started",
    entityType: "conversation",
    entityId: conversationId,
    metadata: {
      tenantId: parsed.data.tenantId,
      unitId: parsed.data.unitId
    }
  });

  return {
    status: 201,
    body: {
      success: true,
      data: {
        conversationId
      }
    }
  };
}

export interface SendManagerMessageRequest {
  session: AuthSession | null;
  conversationId: string;
  body: unknown;
}

export interface SendManagerMessageResponse {
  status: number;
  body: ApiResult<SendManagerMessageOutput>;
}

export interface SendManagerMessageDeps {
  repository: MessageRepository;
  createId: (prefix: string) => string;
  teamFunctionsRepository: TeamPermissionRepository;
}

export async function sendManagerMessage(
  request: SendManagerMessageRequest,
  deps: SendManagerMessageDeps
): Promise<SendManagerMessageResponse> {
  const sessionResult = requireOperatorSession(request.session);
  if (!sessionResult.success) {
    return { status: mapErrorCodeToHttpStatus(sessionResult.code), body: sessionResult };
  }

  const permissionResult = await requirePermission(
    sessionResult.data,
    Permission.MESSAGE_TENANTS,
    deps.teamFunctionsRepository,
    true
  );
  if (!permissionResult.success) {
    return { status: 403, body: permissionResult };
  }

  const parsed = parseSendManagerMessageInput(
    request.conversationId,
    request.body,
    sessionResult.data.organizationId
  );

  if (!parsed.success) {
    return { status: mapErrorCodeToHttpStatus(parsed.code), body: parsed };
  }

  const message = await deps.repository.sendManagerMessage({
    messageId: deps.createId("msg"),
    conversationId: parsed.data.conversationId,
    organizationId: parsed.data.organizationId,
    senderUserId: sessionResult.data.userId,
    body: parsed.data.body
  });

  if (!message) {
    return {
      status: 404,
      body: { success: false, code: "NOT_FOUND", error: "Conversation not found" }
    };
  }

  await logOperatorAuditEvent({
    organizationId: sessionResult.data.organizationId,
    actorMemberId: sessionResult.data.memberships.find((membership) => membership.organizationId === sessionResult.data.organizationId)?.id ?? null,
    actionKey: "operations.conversation.message_sent",
    entityType: "message",
    entityId: message.id,
    metadata: {
      conversationId: message.conversationId
    }
  });

  return {
    status: 201,
    body: {
      success: true,
      data: {
        message
      }
    }
  };
}

export interface ListTenantConversationsRequest {
  session: AuthSession | null;
}

export interface ListTenantConversationsResponse {
  status: number;
  body: ApiResult<ListTenantConversationsOutput>;
}

export interface ListTenantConversationsDeps {
  repository: MessageRepository;
}

export async function listTenantConversations(
  request: ListTenantConversationsRequest,
  deps: ListTenantConversationsDeps
): Promise<ListTenantConversationsResponse> {
  const sessionResult = requireTenantSession(request.session);
  if (!sessionResult.success) {
    return { status: mapErrorCodeToHttpStatus(sessionResult.code), body: sessionResult };
  }

  const conversations = await deps.repository.listTenantConversations(
    sessionResult.data.organizationId,
    sessionResult.data.userId
  );

  return {
    status: 200,
    body: {
      success: true,
      data: {
        conversations
      }
    }
  };
}

export interface GetTenantConversationDetailRequest {
  session: AuthSession | null;
  conversationId: string;
}

export interface GetTenantConversationDetailResponse {
  status: number;
  body: ApiResult<GetTenantConversationDetailOutput>;
}

export interface GetTenantConversationDetailDeps {
  repository: MessageRepository;
}

export async function getTenantConversationDetail(
  request: GetTenantConversationDetailRequest,
  deps: GetTenantConversationDetailDeps
): Promise<GetTenantConversationDetailResponse> {
  const sessionResult = requireTenantSession(request.session);
  if (!sessionResult.success) {
    return { status: mapErrorCodeToHttpStatus(sessionResult.code), body: sessionResult };
  }

  const detail = await deps.repository.getTenantConversationDetail(
    request.conversationId,
    sessionResult.data.organizationId,
    sessionResult.data.userId
  );

  if (!detail) {
    return {
      status: 404,
      body: { success: false, code: "NOT_FOUND", error: "Conversation not found" }
    };
  }

  return {
    status: 200,
    body: { success: true, data: detail }
  };
}

export interface SendTenantMessageRequest {
  session: AuthSession | null;
  conversationId: string;
  body: unknown;
}

export interface SendTenantMessageResponse {
  status: number;
  body: ApiResult<SendTenantMessageOutput>;
}

export interface SendTenantMessageDeps {
  repository: MessageRepository;
  createId: (prefix: string) => string;
}

export async function sendTenantMessage(
  request: SendTenantMessageRequest,
  deps: SendTenantMessageDeps
): Promise<SendTenantMessageResponse> {
  const sessionResult = requireTenantSession(request.session);
  if (!sessionResult.success) {
    return { status: mapErrorCodeToHttpStatus(sessionResult.code), body: sessionResult };
  }

  const parsed = parseSendTenantMessageInput(
    request.conversationId,
    request.body,
    sessionResult.data.organizationId,
    sessionResult.data.userId
  );

  if (!parsed.success) {
    return { status: mapErrorCodeToHttpStatus(parsed.code), body: parsed };
  }

  const message = await deps.repository.sendTenantMessage({
    messageId: deps.createId("msg"),
    conversationId: parsed.data.conversationId,
    organizationId: parsed.data.organizationId,
    tenantAuthUserId: parsed.data.tenantAuthUserId,
    body: parsed.data.body
  });

  if (!message) {
    return {
      status: 404,
      body: { success: false, code: "NOT_FOUND", error: "Conversation not found" }
    };
  }

  return {
    status: 201,
    body: {
      success: true,
      data: {
        message
      }
    }
  };
}
