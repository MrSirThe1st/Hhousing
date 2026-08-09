import type { PlatformBillingDisplayStatus } from "@hhousing/domain";
import { billingStatusBadgeClass, billingStatusLabel } from "../lib/billing/saas-billing-ui";

export default function BillingStatusBadge({
  status,
  suffix
}: {
  status: PlatformBillingDisplayStatus;
  suffix?: string;
}): React.ReactElement {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold tracking-wide ${billingStatusBadgeClass(status)}`}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
          status === "issued"
            ? "bg-amber-500"
            : status === "paid"
              ? "bg-emerald-500"
              : status === "overdue"
                ? "bg-red-500"
                : "bg-slate-400"
        }`}
        aria-hidden
      />
      {billingStatusLabel(status)}
      {suffix ? <span className="font-medium opacity-80">{suffix}</span> : null}
    </span>
  );
}
