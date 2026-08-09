/**
 * V1 deferred-feature isolation (static gating — not a dynamic kill switch).
 *
 * `true` means the feature is deferred for V1: keep code/tables, but do not
 * expose it in navigation or execute it on the active V1 data path.
 *
 * Re-enabling later is an intentional product reintegration (UX + perf +
 * data-layer review), not a flip-and-ship toggle.
 */

export const V1_DEFERRED_FEATURES = {
  audit: true,
  expenses: true,
  reports: true,
  tasksCalendar: true,
  messaging: true,
  maintenance: true
} as const;

export type V1DeferredFeature = keyof typeof V1_DEFERRED_FEATURES;

export function isV1FeatureDeferred(feature: V1DeferredFeature): boolean {
  return V1_DEFERRED_FEATURES[feature];
}

/** Route prefixes that should redirect away when their feature is deferred. */
export const V1_DEFERRED_ROUTE_PREFIXES: ReadonlyArray<{
  feature: V1DeferredFeature;
  prefix: string;
}> = [
  { feature: "expenses", prefix: "/dashboard/expenses" },
  { feature: "reports", prefix: "/dashboard/reports" },
  { feature: "reports", prefix: "/reports/finance/print" },
  { feature: "reports", prefix: "/owner-portal/dashboard/reports" },
  { feature: "audit", prefix: "/dashboard/audit" },
  { feature: "messaging", prefix: "/dashboard/messages" }
];

export function isV1DeferredNavHref(href: string): boolean {
  const path = href.split("?")[0] ?? href;

  for (const { feature, prefix } of V1_DEFERRED_ROUTE_PREFIXES) {
    if (!isV1FeatureDeferred(feature)) {
      continue;
    }
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      return true;
    }
  }

  return false;
}
