export default function DashboardOverviewSkeleton(): React.ReactElement {
  return (
    <div className="p-8 animate-pulse">
      {/* Header */}
      <div className="mb-6">
        <div className="h-8 w-64 rounded-lg bg-slate-200 mb-2" />
        <div className="h-4 w-48 rounded bg-slate-200 mb-1" />
        <div className="h-4 w-40 rounded bg-slate-200" />
      </div>

      {/* Tabs */}
      <div className="mb-6 inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        <div className="h-9 w-24 rounded-lg bg-slate-200 mr-1" />
        <div className="h-9 w-24 rounded-lg bg-slate-100 mr-1" />
        <div className="h-9 w-24 rounded-lg bg-slate-100" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="h-4 w-32 rounded bg-slate-200 mb-2" />
            <div className="h-9 w-20 rounded bg-slate-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
