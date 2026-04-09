interface FinanceSummaryCardItem {
  label: string;
  value: string;
  hint?: string;
}

interface FinanceSummaryCardsProps {
  items: FinanceSummaryCardItem[];
}

export default function FinanceSummaryCards({ items }: FinanceSummaryCardsProps): React.ReactElement {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <article key={item.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">{item.label}</p>
          <p className="mt-2 text-2xl font-semibold text-[#010a19]">{item.value}</p>
          {item.hint ? <p className="mt-2 text-xs text-gray-500">{item.hint}</p> : null}
        </article>
      ))}
    </div>
  );
}