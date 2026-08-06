import type { ServiceProviderWithCategory } from "@hhousing/api-contracts";
import { isPlatformVerified } from "./prestataires-shared";

function VerifiedBadgeIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M16.403 12.652a3 3 0 000-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function PrestatairesTrustBadge({
  provider
}: {
  provider: ServiceProviderWithCategory;
}): React.ReactElement {
  if (isPlatformVerified(provider)) {
    return (
      <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
        <VerifiedBadgeIcon />
        Vérifié par la plateforme
      </span>
    );
  }

  return (
    <span className="mt-1 inline-flex text-[11px] font-medium text-slate-500 dark:text-slate-400">
      Ajouté par le gestionnaire
    </span>
  );
}
