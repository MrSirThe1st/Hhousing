type DashboardOccupancyBarProps = {
  occupiedUnits: number;
  units: number;
  occupancyRate: number;
};

export default function DashboardOccupancyBar({
  occupiedUnits,
  units,
  occupancyRate
}: DashboardOccupancyBarProps): React.ReactElement {
  const width = Math.max(0, Math.min(100, occupancyRate));

  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Occupation
        </p>
        <p className="text-sm font-semibold text-[#010a19] dark:text-white">{occupancyRate}%</p>
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {occupiedUnits} / {units} logements occupés
      </p>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
        role="progressbar"
        aria-valuenow={occupancyRate}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Occupation ${occupancyRate} pour cent`}
      >
        <div className="h-full rounded-full bg-[#0063fe] transition-[width]" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
