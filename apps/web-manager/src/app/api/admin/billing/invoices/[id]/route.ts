import { createPlatformAdminRepositoryFromEnv, createPlatformBillingRepositoryFromEnv } from "@hhousing/data-access";
import { mapErrorCodeToHttpStatus, requirePlatformAdminSession } from "../../../../../../api/shared";
import { extractAuthSessionFromCookies } from "../../../../../../auth/session-adapter";
import { jsonResponse } from "../../../../shared";
import { randomUUID } from "crypto";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const access = requirePlatformAdminSession(await extractAuthSessionFromCookies());
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const { id } = await context.params;

  try {
    const repo = createPlatformBillingRepositoryFromEnv(process.env);
    const data = await repo.getInvoiceById(id);
    if (!data) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Invoice not found"
      });
    }
    return jsonResponse(200, { success: true, data });
  } catch (error) {
    console.error("Failed to load SaaS invoice", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to load invoice"
    });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const access = requirePlatformAdminSession(await extractAuthSessionFromCookies());
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const { id } = await context.params;
  let body: { action?: string; voidReason?: string | null };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: "Invalid JSON body"
    });
  }

  if (body.action !== "confirm_paid" && body.action !== "void") {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: "action must be confirm_paid or void"
    });
  }

  try {
    const billingRepo = createPlatformBillingRepositoryFromEnv(process.env);
    const adminRepo = createPlatformAdminRepositoryFromEnv(process.env);

    const data =
      body.action === "confirm_paid"
        ? await billingRepo.confirmInvoicePaid({
            invoiceId: id,
            confirmedByUserId: access.data.userId
          })
        : await billingRepo.voidInvoice({
            invoiceId: id,
            voidReason: body.voidReason ?? null
          });

    if (!data) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Invoice not found or not actionable"
      });
    }

    await adminRepo.createPlatformAuditLog({
      id: randomUUID(),
      actorUserId: access.data.userId,
      actionKey: body.action === "confirm_paid" ? "billing.invoice.paid" : "billing.invoice.void",
      entityType: "saas_invoice",
      entityId: id,
      metadata: {
        organizationId: data.organizationId,
        period: data.period,
        amountDue: data.amountDue,
        voidReason: body.voidReason ?? null
      }
    });

    return jsonResponse(200, { success: true, data });
  } catch (error) {
    console.error("Failed to update SaaS invoice", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to update invoice"
    });
  }
}
