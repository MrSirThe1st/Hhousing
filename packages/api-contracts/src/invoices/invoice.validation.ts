import type { ApiResult } from "../api-result.types";
import type { ListInvoicesFilter, QueueInvoiceEmailInput, VoidInvoiceInput } from "./invoice.types";

function asNonEmptyText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function parseOptionalStatus(value: unknown): ListInvoicesFilter["status"] | undefined | null {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (value === "issued" || value === "partial" || value === "paid" || value === "void") {
    return value;
  }

  return null;
}

function parseOptionalEmailStatus(value: unknown): ListInvoicesFilter["emailStatus"] | undefined | null {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (value === "not_sent" || value === "queued" || value === "sent" || value === "failed") {
    return value;
  }

  return null;
}

export function parseListInvoicesFilter(input: {
  organizationId: string | null;
  leaseId: string | null;
  status: string | null;
  emailStatus: string | null;
  year: string | null;
  sessionOrganizationId: string;
}): ApiResult<ListInvoicesFilter> {
  const organizationId = input.organizationId ?? input.sessionOrganizationId;

  if (organizationId !== input.sessionOrganizationId) {
    return {
      success: false,
      code: "FORBIDDEN",
      error: "Organization mismatch"
    };
  }

  const status = parseOptionalStatus(input.status);
  if (status === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "status is invalid"
    };
  }

  const emailStatus = parseOptionalEmailStatus(input.emailStatus);
  if (emailStatus === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "emailStatus is invalid"
    };
  }

  let year: number | undefined;
  if (input.year !== null && input.year !== undefined) {
    const parsedYear = Number(input.year);
    if (!Number.isInteger(parsedYear) || parsedYear < 2000 || parsedYear > 2200) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        error: "year is invalid"
      };
    }
    year = parsedYear;
  }

  return {
    success: true,
    data: {
      organizationId,
      leaseId: input.leaseId ?? undefined,
      status,
      emailStatus,
      year
    }
  };
}

export function parseQueueInvoiceEmailInput(
  invoiceId: string,
  input: unknown,
  sessionOrganizationId: string
): ApiResult<QueueInvoiceEmailInput> {
  if (typeof input !== "object" || input === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "Body must be an object"
    };
  }

  const payload = input as Record<string, unknown>;
  const action = asNonEmptyText(payload.action);
  if (action !== "send" && action !== "resend") {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "action must be send or resend"
    };
  }

  return {
    success: true,
    data: {
      invoiceId,
      organizationId: sessionOrganizationId,
      reason: action
    }
  };
}

export function parseVoidInvoiceInput(
  invoiceId: string,
  input: unknown,
  sessionOrganizationId: string
): ApiResult<VoidInvoiceInput> {
  if (typeof input !== "object" || input === null) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "Body must be an object"
    };
  }

  const payload = input as Record<string, unknown>;
  const action = asNonEmptyText(payload.action);
  if (action !== "void") {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "action must be void"
    };
  }

  const reason = asNonEmptyText(payload.reason);
  if (!reason || reason.length < 3) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "reason is required (min 3 chars)"
    };
  }

  return {
    success: true,
    data: {
      invoiceId,
      organizationId: sessionOrganizationId,
      reason
    }
  };
}
