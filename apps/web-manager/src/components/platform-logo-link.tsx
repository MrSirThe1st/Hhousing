import Image from "next/image";
import Link from "next/link";

interface PlatformLogoLinkProps {
  subtitle?: string;
  centered?: boolean;
  /** Show the small “Gestion de vos locations” line under the wordmark. Default false. */
  showTagline?: boolean;
}

export default function PlatformLogoLink({
  subtitle,
  centered = false,
  showTagline = false
}: PlatformLogoLinkProps): React.ReactElement {
  return (
    <div className={centered ? "text-center" : "text-left"}>
      <Link
        href="/"
        className={`inline-flex max-w-full items-center gap-2.5 rounded-2xl border border-gray-200 bg-white px-3.5 py-2.5 text-[#010a19] shadow-sm transition hover:border-[#0063fe]/30 hover:bg-blue-50 sm:gap-3 sm:px-4 sm:py-3 ${centered ? "justify-center" : "justify-start"}`}
        aria-label="Retour à la page d'accueil"
      >
        <Image
          src="/brand/haraka-pay-logo.svg"
          alt="Haraka Property"
          width={44}
          height={44}
          className="h-9 w-9 shrink-0 sm:h-11 sm:w-11"
        />
        <span className="min-w-0 text-left">
          <span className="block truncate text-base font-semibold tracking-tight sm:text-lg">
            Haraka Property
          </span>
          {showTagline ? (
            <span className="mt-0.5 block text-[10px] uppercase tracking-[0.16em] text-gray-500 sm:text-xs">
              Gestion de vos locations
            </span>
          ) : null}
        </span>
      </Link>
      {subtitle ? (
        <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-gray-600 sm:mt-3 sm:text-sm">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
