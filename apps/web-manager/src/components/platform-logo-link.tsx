import Image from "next/image";
import Link from "next/link";

interface PlatformLogoLinkProps {
  subtitle?: string;
  centered?: boolean;
}

export default function PlatformLogoLink({
  subtitle,
  centered = false
}: PlatformLogoLinkProps): React.ReactElement {
  return (
    <div className={centered ? "text-center" : "text-left"}>
      <Link
        href="/"
        className={`inline-flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[#010a19] shadow-sm transition hover:border-[#0063fe]/30 hover:bg-blue-50 ${centered ? "justify-center" : "justify-start"}`}
        aria-label="Retour a la page d'accueil"
      >
        <Image src="/brand/haraka-pay-logo.svg" alt="Haraka Property" width={44} height={44} className="h-11 w-11" />
        <span className="text-left">
          <span className="block text-lg font-semibold tracking-tight">Haraka Property</span>
          <span className="block text-xs uppercase tracking-[0.16em] text-gray-500">Opérations locatives</span>
        </span>
      </Link>
      {subtitle ? <p className="mt-3 text-sm text-gray-600">{subtitle}</p> : null}
    </div>
  );
}