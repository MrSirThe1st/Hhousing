import { createAuthRepo, createTenantLeaseRepo, jsonResponse } from "../../../shared";
import { finalizeTenantAccountDeletions } from "../../../../../api/tenants/tenant-delete-account";
import {
  createAccountDeletionNotifierFromEnv,
  createSupabaseUserDeleterFromEnv
} from "../../../../../lib/notifications/account-deletion-notifiers";

function getBearerToken(headers: Headers): string | null {
  const authorization = headers.get("authorization");
  if (!authorization) {
    return null;
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  return token ? token : null;
}

export async function GET(request: Request): Promise<Response> {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return jsonResponse(500, {
      success: false,
      error: "CRON_SECRET is not configured"
    });
  }

  const providedSecret = getBearerToken(request.headers);
  if (providedSecret !== cronSecret) {
    return jsonResponse(401, {
      success: false,
      error: "Unauthorized"
    });
  }

  const hashSalt =
    process.env.ACCOUNT_DELETION_HASH_SALT?.trim()
    || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    || "hhousing-account-deletion";

  let notify;
  try {
    notify = createAccountDeletionNotifierFromEnv();
  } catch {
    notify = undefined;
  }

  try {
    const result = await finalizeTenantAccountDeletions({
      tenantRepository: createTenantLeaseRepo(),
      authRepository: createAuthRepo(),
      hashSalt,
      deleteSupabaseUser: createSupabaseUserDeleterFromEnv(),
      notify
    });

    return jsonResponse(200, {
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Failed to finalize tenant account deletions", error);
    return jsonResponse(500, {
      success: false,
      error: error instanceof Error ? error.message : "Finalization failed"
    });
  }
}
