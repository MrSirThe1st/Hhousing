import { redirect } from "next/navigation";
import type { ApiResult } from "@hhousing/api-contracts";
import { isV1FeatureDeferred, type V1DeferredFeature } from "./v1-deferred-features";

/**
 * Page-level redirect when a feature is deferred for V1.
 * Call from route layouts after any existing auth/experience guards.
 */
export function redirectIfV1FeatureDeferred(
  feature: V1DeferredFeature,
  redirectTo = "/dashboard"
): void {
  if (isV1FeatureDeferred(feature)) {
    redirect(redirectTo);
  }
}

/**
 * API-level feature gate result. Call ONLY after authentication and
 * authorization / tenant scoping have already succeeded.
 *
 * Feature gating must never replace, bypass, reorder, or weaken existing
 * authentication, authorization, tenant-scoping, or RLS checks.
 */
export function rejectIfV1FeatureDeferred(
  feature: V1DeferredFeature
): ApiResult<never> | null {
  if (!isV1FeatureDeferred(feature)) {
    return null;
  }

  return {
    success: false,
    code: "FEATURE_DISABLED",
    error: "Cette fonctionnalité n'est pas disponible dans cette version."
  };
}
