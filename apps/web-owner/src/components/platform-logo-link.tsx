import Link from "next/link";

interface PlatformLogoLinkProps {
  subtitle?: string;
  centered?: boolean;
}

export default function PlatformLogoLink({ subtitle, centered = false }: PlatformLogoLinkProps): React.ReactElement {
  return (
    <div className={centered ? "text-center" : "text-left"}>
      <Link
        href="/"
        className={`inline-flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[#010a19] shadow-sm transition hover:border-[#0063fe]/30 hover:bg-blue-50 ${centered ? "justify-center" : "justify-start"}`}
        aria-label="Retour au portail owner"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0063fe] text-sm font-bold text-white">
          HH
        </span>
        <span className="text-left">
          <span className="block text-lg font-semibold tracking-tight">Hhousing</span>
          <span className="block text-xs uppercase tracking-[0.16em] text-gray-500">Owner portal</span>
        </span>
      </Link>
      {subtitle ? <p className="mt-3 text-sm text-gray-600">{subtitle}</p> : null}
    </div>
  );
}
