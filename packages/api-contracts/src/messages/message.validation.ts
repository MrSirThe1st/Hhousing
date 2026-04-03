import type { ApiResult } from "../api-result.types";
import type {
  ListManagerConversationsFilter,
  StartManagerConversationInput,
  SendManagerMessageInput
} from "./message.types";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asNonEmptyText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function parseListManagerConversationsFilter(
  input: unknown,
  sessionOrganizationId: string
): ApiResult<ListManagerConversationsFilter> {
  if (!isObject(input)) {
    return { success: false, code: "VALIDATION_ERROR", error: "Query must be an object" };
  }

  const propertyId = asNonEmptyText(input.propertyId);
  const q = asNonEmptyText(input.q);

  return {
    success: true,
    data: {
      organizationId: sessionOrganizationId,
      propertyId: propertyId ?? undefined,
      q: q ?? undefined
    }
  };
}

export function parseStartManagerConversationInput(
  input: unknown,
  sessionOrganizationId: string
): ApiResult<StartManagerConversationInput> {
  if (!isObject(input)) {
    return { success: false, code: "VALIDATION_ERROR", error: "Body must be an object" };
  }

  const tenantId = asNonEmptyText(input.tenantId);
  const unitId = asNonEmptyText(input.unitId);
  const body = asNonEmptyText(input.body);

  if (tenantId === null) {
    return { success: false, code: "VALIDATION_ERROR", error: "tenantId is required" };
  }

  if (body === null) {
    return { success: false, code: "VALIDATION_ERROR", error: "body is required" };
  }

  return {
    success: true,
    data: {
      organizationId: sessionOrganizationId,
      tenantId,
      unitId: unitId ?? undefined,
      body
    }
  };
}

export function parseSendManagerMessageInput(
  conversationId: string,
  input: unknown,
  sessionOrganizationId: string
): ApiResult<SendManagerMessageInput> {
  if (!isObject(input)) {
    return { success: false, code: "VALIDATION_ERROR", error: "Body must be an object" };
  }

  const body = asNonEmptyText(input.body);
  if (body === null) {
    return { success: false, code: "VALIDATION_ERROR", error: "body is required" };
  }

  return {
    success: true,
    data: {
      conversationId,
      organizationId: sessionOrganizationId,
      body
    }
  };
}