export default function TableSkeleton(): React.ReactElement {
  return (
    <div className="p-8 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-40 rounded-lg bg-gray-200" />
        <div className="h-9 w-24 rounded-lg bg-gray-200" />
      </div>
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 flex gap-8">
          {[120, 180, 100, 80, 80].map((w, i) => (
            <div key={i} className="h-3 rounded bg-gray-200" style={{ width: w }} />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-8 px-4 py-4 border-t border-gray-100">
            {[120, 180, 100, 80, 80].map((w, j) => (
              <div key={j} className="h-4 rounded bg-gray-100" style={{ width: w }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
