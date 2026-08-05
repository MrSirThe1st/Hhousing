import { createPlatformAdminRepositoryFromEnv, createPlatformBillingRepositoryFromEnv } from "@hhousing/data-access";
import type { PlatformPaymentProvider } from "@hhousing/domain";
import { mapErrorCodeToHttpStatus, requirePlatformAdminSession } from "../../../../../../api/shared";
import { extractAuthSessionFromCookies } from "../../../../../../auth/session-adapter";
import { jsonResponse } from "../../../../shared";
import { randomUUID } from "crypto";

const PROVIDERS = new Set<PlatformPaymentProvider>(["airtel", "orange", "mpesa", "other"]);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const access = requirePlatformAdminSession(await extractAuthSessionFromCookies());
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const { id } = await context.params;
  let body: {
    provider?: string;
    displayName?: string;
    accountNumber?: string;
    instructions?: string | null;
    isActive?: boolean;
    sortOrder?: number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: "Invalid JSON body"
    });
  }

  if (body.provider !== undefined && !PROVIDERS.has(body.provider as PlatformPaymentProvider)) {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: "provider must be airtel, orange, mpesa, or other"
    });
  }

  try {
    const billingRepo = createPlatformBillingRepositoryFromEnv(process.env);
    const adminRepo = createPlatformAdminRepositoryFromEnv(process.env);
    const data = await billingRepo.updatePaymentMethod({
      id,
      provider: body.provider as PlatformPaymentProvider | undefined,
      displayName: body.displayName?.trim(),
      accountNumber: body.accountNumber?.trim(),
      instructions: body.instructions,
      isActive: body.isActive,
      sortOrder: body.sortOrder
    });

    if (!data) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Payment method not found"
      });
    }

    await adminRepo.createPlatformAuditLog({
      id: randomUUID(),
      actorUserId: access.data.userId,
      actionKey: "billing.payment_method.update",
      entityType: "payment_method",
      entityId: id,
      metadata: body as Record<string, unknown>
    });

    return jsonResponse(200, { success: true, data });
  } catch (error) {
    console.error("Failed to update payment method", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to update payment method"
    });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const access = requirePlatformAdminSession(await extractAuthSessionFromCookies());
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  const { id } = await context.params;

  try {
    const billingRepo = createPlatformBillingRepositoryFromEnv(process.env);
    const adminRepo = createPlatformAdminRepositoryFromEnv(process.env);
    const deleted = await billingRepo.deletePaymentMethod(id);
    if (!deleted) {
      return jsonResponse(404, {
        success: false,
        code: "NOT_FOUND",
        error: "Payment method not found"
      });
    }

    await adminRepo.createPlatformAuditLog({
      id: randomUUID(),
      actorUserId: access.data.userId,
      actionKey: "billing.payment_method.delete",
      entityType: "payment_method",
      entityId: id
    });

    return jsonResponse(200, { success: true, data: { id } });
  } catch (error) {
    console.error("Failed to delete payment method", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to delete payment method"
    });
  }
}
