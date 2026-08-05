import { createPlatformAdminRepositoryFromEnv, createPlatformBillingRepositoryFromEnv } from "@hhousing/data-access";
import { mapErrorCodeToHttpStatus, requirePlatformAdminSession } from "../../../../../api/shared";
import { extractAuthSessionFromCookies } from "../../../../../auth/session-adapter";
import { jsonResponse } from "../../../shared";
import { randomUUID } from "crypto";

export async function GET(): Promise<Response> {
  const access = requirePlatformAdminSession(await extractAuthSessionFromCookies());
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  try {
    const repo = createPlatformBillingRepositoryFromEnv(process.env);
    const data = await repo.getBillingSettings();
    return jsonResponse(200, { success: true, data });
  } catch (error) {
    console.error("Failed to load billing settings", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to load billing settings"
    });
  }
}

export async function PATCH(request: Request): Promise<Response> {
  const access = requirePlatformAdminSession(await extractAuthSessionFromCookies());
  if (!access.success) {
    return jsonResponse(mapErrorCodeToHttpStatus(access.code), access);
  }

  let body: {
    pricePerUnitAmount?: number;
    currencyCode?: string;
    freePropertyThreshold?: number;
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

  if (
    typeof body.pricePerUnitAmount !== "number" ||
    !Number.isFinite(body.pricePerUnitAmount) ||
    body.pricePerUnitAmount < 0
  ) {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: "pricePerUnitAmount must be a non-negative number"
    });
  }

  if (
    typeof body.freePropertyThreshold !== "number" ||
    !Number.isInteger(body.freePropertyThreshold) ||
    body.freePropertyThreshold < 0
  ) {
    return jsonResponse(400, {
      success: false,
      code: "VALIDATION_ERROR",
      error: "freePropertyThreshold must be a non-negative integer"
    });
  }

  try {
    const billingRepo = createPlatformBillingRepositoryFromEnv(process.env);
    const adminRepo = createPlatformAdminRepositoryFromEnv(process.env);
    const data = await billingRepo.updateBillingSettings({
      pricePerUnitAmount: body.pricePerUnitAmount,
      currencyCode: body.currencyCode,
      freePropertyThreshold: body.freePropertyThreshold
    });

    await adminRepo.createPlatformAuditLog({
      id: randomUUID(),
      actorUserId: access.data.userId,
      actionKey: "billing.settings.update",
      entityType: "billing_settings",
      entityId: "default",
      metadata: {
        pricePerUnitAmount: data.pricePerUnitAmount,
        freePropertyThreshold: data.freePropertyThreshold,
        currencyCode: data.currencyCode
      }
    });

    return jsonResponse(200, { success: true, data });
  } catch (error) {
    console.error("Failed to update billing settings", error);
    return jsonResponse(500, {
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to update billing settings"
    });
  }
}
