import type { CurrencyTotal } from "../lib/finance-reporting.types";

function sortCurrencyTotals(totals: CurrencyTotal[]): CurrencyTotal[] {
  return [...totals].sort((left, right) => left.currencyCode.localeCompare(right.currencyCode, "fr"));
}

interface CurrencyTotalStackProps {
  totals: CurrencyTotal[];
  tone?: "primary" | "muted";
  size?: "md" | "sm";
  emptyLabel?: string;
}

export default function CurrencyTotalStack({
  totals,
  tone = "primary",
  size = "md",
  emptyLabel = "0"
}: CurrencyTotalStackProps): React.ReactElement {
  const rows = sortCurrencyTotals(totals);
  const amountClass = size === "sm" ? "text-sm" : "text-lg";
  const emptyClass = size === "sm" ? "text-sm" : "text-xl";

  if (rows.length === 0) {
    return (
      <p className={`${emptyClass} font-semibold tabular-nums ${tone === "muted" ? "text-slate-600" : "text-[#010a19]"}`}>
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {rows.map((total) => (
        <div key={total.currencyCode} className="flex items-baseline justify-between gap-3">
          <span className={`text-xs font-semibold uppercase tracking-wide ${tone === "muted" ? "text-slate-400" : "text-slate-500"}`}>
            {total.currencyCode}
          </span>
          <span
            className={`text-right font-semibold tabular-nums ${amountClass} ${
              tone === "muted" ? "text-slate-600" : "text-[#010a19]"
            }`}
          >
            {total.amount.toLocaleString("fr-FR")}
          </span>
        </div>
      ))}
    </div>
  );
}
