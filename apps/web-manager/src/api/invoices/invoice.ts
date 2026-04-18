import type {
  ApiResult,
  AuthSession,
  GetInvoiceDetailOutput,
  ListInvoicesOutput,
  VoidInvoiceOutput
} from "@hhousing/api-contracts";
import {
  Permission,
  parseListInvoicesFilter,
  parseVoidInvoiceInput
} from "@hhousing/api-contracts";
import type { InvoiceRepository } from "@hhousing/data-access";
import { logOperatorAuditEvent } from "../audit-log";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../shared";
import type { TeamPermissionRepository } from "../organizations/permissions";
import { requirePermission } from "../organizations/permissions";

export interface ListInvoicesRequest {
  organizationId: string | null;
  leaseId: string | null;
  status: string | null;
  emailStatus: string | null;
  year: string | null;
  session: AuthSession | null;
}

export interface ListInvoicesResponse {
  status: number;
  body: ApiResult<ListInvoicesOutput>;
}

export interface ListInvoicesDeps {
  repository: InvoiceRepository;
  teamFunctionsRepository: TeamPermissionRepository;
}

export async function listInvoices(
  request: ListInvoicesRequest,
  deps: ListInvoicesDeps
): Promise<ListInvoicesResponse> {
  const sessionResult = requireOperatorSession(request.session);
  if (!sessionResult.success) {
    return { status: mapErrorCodeToHttpStatus(sessionResult.code), body: sessionResult };
  }

  const permissionResult = await requirePermission(
    sessionResult.data,
    Permission.VIEW_PAYMENTS,
    deps.teamFunctionsRepository
  );
  if (!permissionResult.success) {
    return { status: 403, body: permissionResult };
  }

  const parsed = parseListInvoicesFilter({
    organizationId: request.organizationId,
    leaseId: request.leaseId,
    status: request.status,
    emailStatus: request.emailStatus,
    year: request.year,
    sessionOrganizationId: sessionResult.data.organizationId
  });
  if (!parsed.success) {
    return { status: mapErrorCodeToHttpStatus(parsed.code), body: parsed };
  }

  const invoices = await deps.repository.listInvoices(parsed.data);
  return { status: 200, body: { success: true, data: { invoices } } };
}

export interface GetInvoiceDetailRequest {
  invoiceId: string;
  session: AuthSession | null;
}

export interface GetInvoiceDetailResponse {
  status: number;
  body: ApiResult<GetInvoiceDetailOutput>;
}

export interface GetInvoiceDetailDeps {
  repository: InvoiceRepository;
  teamFunctionsRepository: TeamPermissionRepository;
}

export async function getInvoiceDetail(
  request: GetInvoiceDetailRequest,
  deps: GetInvoiceDetailDeps
): Promise<GetInvoiceDetailResponse> {
  const sessionResult = requireOperatorSession(request.session);
  if (!sessionResult.success) {
    return { status: mapErrorCodeToHttpStatus(sessionResult.code), body: sessionResult };
  }

  const permissionResult = await requirePermission(
    sessionResult.data,
    Permission.VIEW_PAYMENTS,
    deps.teamFunctionsRepository
  );
  if (!permissionResult.success) {
    return { status: 403, body: permissionResult };
  }

  const detail = await deps.repository.getInvoiceDetail(request.invoiceId, sessionResult.data.organizationId);
  if (!detail) {
    return {
      status: 404,
      body: { success: false, code: "NOT_FOUND", error: "Invoice not found" }
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      data: {
        invoice: detail.invoice,
        applications: detail.applications,
        creditBalance: detail.creditBalance
      }
    }
  };
}

export interface VoidInvoiceRequest {
  invoiceId: string;
  body: unknown;
  session: AuthSession | null;
}

export interface VoidInvoiceResponse {
  status: number;
  body: ApiResult<VoidInvoiceOutput>;
}

export interface VoidInvoiceDeps {
  repository: InvoiceRepository;
  teamFunctionsRepository: TeamPermissionRepository;
}

export async function voidInvoice(
  request: VoidInvoiceRequest,
  deps: VoidInvoiceDeps
): Promise<VoidInvoiceResponse> {
  const sessionResult = requireOperatorSession(request.session);
  if (!sessionResult.success) {
    return { status: mapErrorCodeToHttpStatus(sessionResult.code), body: sessionResult };
  }

  const permissionResult = await requirePermission(
    sessionResult.data,
    Permission.RECORD_PAYMENT,
    deps.teamFunctionsRepository,
    true
  );
  if (!permissionResult.success) {
    return { status: 403, body: permissionResult };
  }

  const parsed = parseVoidInvoiceInput(
    request.invoiceId,
    request.body,
    sessionResult.data.organizationId
  );
  if (!parsed.success) {
    return { status: mapErrorCodeToHttpStatus(parsed.code), body: parsed };
  }

  const result = await deps.repository.voidInvoice(
    request.invoiceId,
    sessionResult.data.organizationId,
    parsed.data.reason
  );
  if (!result) {
    return {
      status: 404,
      body: { success: false, code: "NOT_FOUND", error: "Invoice not found" }
    };
  }

  await logOperatorAuditEvent({
    organizationId: sessionResult.data.organizationId,
    actorMemberId: sessionResult.data.memberships.find((membership) => membership.organizationId === sessionResult.data.organizationId)?.id ?? null,
    actionKey: "operations.invoice.voided",
    entityType: "invoice",
    entityId: result.invoice.id,
    metadata: {
      creditAdjustedAmount: result.creditAdjustedAmount,
      status: result.invoice.status
    }
  });

  return {
    status: 200,
    body: {
      success: true,
      data: {
        invoice: result.invoice,
        creditAdjustedAmount: result.creditAdjustedAmount
      }
    }
  };
}
