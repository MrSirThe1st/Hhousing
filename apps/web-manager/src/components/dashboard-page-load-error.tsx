/**
 * Shared error banner for dashboard RSC pages that fail under pool timeouts.
 */
export default function DashboardPageLoadError({
  message = "Impossible de charger cette page pour le moment. Réessayez dans un instant."
}: {
  message?: string;
}): React.ReactElement {
  return (
    <div className="m-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 md:m-6">
      {message}
    </div>
  );
}
