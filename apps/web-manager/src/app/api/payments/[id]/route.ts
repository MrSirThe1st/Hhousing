import { markPaymentPaid } from "../../../../api";
import { mapErrorCodeToHttpStatus, requireOperatorSession } from "../../../../api/shared";
import { requirePermission } from "../../../../api/organizations/permissions";
import { Permission } from "@hhousing/api-contracts";
import { extractAuthSessionFromCookies } from "../../../../auth/session-adapter";
import { getScopedPortfolioData } from "../../../../lib/operator-scope-portfolio";
import { sendRawHtmlEmailFromEnv } from "../../../../lib/email/resend";
import {
  createInvoiceRepo,
  createPaymentRepo,
  createRepositoryFromEnv,
  createTeamFunctionsRepo,
  createTenantLeaseRepo,
  jsonResponse,
  parseJsonBody
} from "../../shared";

export async function GET(
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
    Permission.VIEW_PAYMENTS,
    createTeamFunctionsRepo()
  );
  if (!permissionResult.success) {
    return jsonResponse(403, permissionResult);
  }

  const repository = createPaymentRepo();

  try {
    const payment = await repository.getPaymentById(id, access.data.organizationId);

    if (!payment) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Payment not found"
      });
    }

    const scopedPortfolio = await getScopedPortfolioData(access.data);
    if (!scopedPortfolio.leaseIds.has(payment.leaseId)) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Payment not found"
      });
    }

    return jsonResponse(200, {
      success: true,
      data: payment
    });
  } catch (error) {
    console.error("Failed to fetch payment", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to fetch payment"
    });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const session = await extractAuthSessionFromCookies();

  const access = requireOperatorSession(session);
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const paymentRepository = createPaymentRepo();
  const existingPayment = await paymentRepository.getPaymentById(id, access.data.organizationId);

  if (!existingPayment) {
    return jsonResponse(404, {
      success: false,
      code: "NOT_FOUND",
      error: "Payment not found"
    });
  }

  const scopedPortfolio = await getScopedPortfolioData(access.data);
  if (!scopedPortfolio.leaseIds.has(existingPayment.leaseId)) {
    return jsonResponse(404, {
      success: false,
      code: "NOT_FOUND",
      error: "Payment not found"
    });
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

  const organizationRepositoryResult = createRepositoryFromEnv();

  const result = await markPaymentPaid(
    {
      paymentId: id,
      body,
      session
    },
    {
      repository: paymentRepository,
      teamFunctionsRepository: createTeamFunctionsRepo(),
      invoiceRepository: createInvoiceRepo(),
      tenantRepository: createTenantLeaseRepo(),
      organizationRepository: organizationRepositoryResult.success ? organizationRepositoryResult.data : undefined,
      sendInvoicePaidEmail: sendRawHtmlEmailFromEnv
    }
  );

  return jsonResponse(result.status, result.body);
}
