import { createPlatformAdminRepositoryFromEnv, createPlatformBillingRepositoryFromEnv } from "@hhousing/data-access";
import type { PlatformPaymentProvider } from "@hhousing/domain";
import { mapErrorCodeToHttpStatus, requirePlatformAdminSession } from "../../../../../api/shared";
import { extractAuthSessionFromCookies } from "../../../../../auth/session-adapter";
import { jsonResponse } from "../../../shared";
import { randomUUID } from "crypto";

const PROVIDERS = new Set<PlatformPaymentProvider>(["airtel", "orange", "mpesa", "other"]);

export async function GET(): Promise<Response> {
  const access = requirePlatformAdminSession(await extractAuthSessionFromCookies());
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  try {
    const repo = createPlatformBillingRepositoryFromEnv(process.env);
    const data = await repo.listPaymentMethods(false);
    return jsonResponse(200, { success: true, data });
  } catch (error) {
    console.error("Failed to list payment methods", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to list payment methods"
    });
  }
}

export async function POST(request: Request): Promise<Response> {
  const access = requirePlatformAdminSession(await extractAuthSessionFromCookies());
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

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

  if (!body.provider || !PROVIDERS.has(body.provider as PlatformPaymentProvider)) {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: "provider must be airtel, orange, mpesa, or other"
    });
  }

  const displayName = body.displayName?.trim();
  const accountNumber = body.accountNumber?.trim();
  if (!displayName || !accountNumber) {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: "displayName and accountNumber are required"
    });
  }

  try {
    const billingRepo = createPlatformBillingRepositoryFromEnv(process.env);
    const adminRepo = createPlatformAdminRepositoryFromEnv(process.env);
    const id = randomUUID();
    const data = await billingRepo.createPaymentMethod({
      id,
      provider: body.provider as PlatformPaymentProvider,
      displayName,
      accountNumber,
      instructions: body.instructions?.trim() || null,
      isActive: body.isActive ?? true,
      sortOrder: body.sortOrder ?? 0
    });

    await adminRepo.createPlatformAuditLog({
      id: randomUUID(),
      actorUserId: access.data.userId,
      actionKey: "billing.payment_method.create",
      entityType: "payment_method",
      entityId: id,
      metadata: { provider: data.provider, accountNumber: data.accountNumber }
    });

    return jsonResponse(201, { success: true, data });
  } catch (error) {
    console.error("Failed to create payment method", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to create payment method"
    });
  }
}
