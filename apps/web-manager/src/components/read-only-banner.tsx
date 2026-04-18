export default function ReadOnlyBanner(): React.ReactElement {
  return (
    <div className="flex items-center gap-2.5 border-b border-amber-200 bg-amber-50 px-8 py-2.5">
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true">
        <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <p className="text-sm text-amber-700">
        <span className="font-semibold">Read-only access.</span>{" "}
        You can view this section but cannot create or modify records. Contact your administrator to request additional permissions.
      </p>
    </div>
  );
}
