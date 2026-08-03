import Link from "next/link";
import type { Metadata } from "next";
import PublicSiteFooter from "./public-site-footer";
import PublicSiteNavbar from "./public-site-navbar";
import { LEGAL_LAST_UPDATED, LEGAL_SITE_NAME } from "../lib/legal/site-legal";

type LegalDocumentPageProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export function buildLegalMetadata(title: string, description: string): Metadata {
  return {
    title: `${title} — ${LEGAL_SITE_NAME}`,
    description,
    robots: {
      index: true,
      follow: true
    }
  };
}

export default function LegalDocumentPage({
  title,
  description,
  children
}: LegalDocumentPageProps): React.ReactElement {
  return (
    <main className="min-h-screen bg-white text-slate-950 dark:bg-[#0B1220] dark:text-slate-50">
      <PublicSiteNavbar />

      <div className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-[#111827]">
        <div className="mx-auto max-w-4xl px-6 py-10 lg:px-10">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0063fe]">Informations légales</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#010a19] dark:text-slate-50 md:text-4xl">{title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">{description}</p>
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">Dernière mise à jour : {LEGAL_LAST_UPDATED}</p>
          <div className="mt-5 flex flex-wrap gap-4 text-sm">
            <Link href="/politique-de-confidentialite" className="text-[#0063fe] hover:underline">
              Politique de confidentialité
            </Link>
            <Link href="/conditions-utilisation" className="text-[#0063fe] hover:underline">
              Conditions d&apos;utilisation
            </Link>
            <Link href="/suppression-donnees" className="text-[#0063fe] hover:underline">
              Suppression des données
            </Link>
            <Link href="/support" className="text-[#0063fe] hover:underline">
              Support
            </Link>
          </div>
        </div>
      </div>

      <article className="mx-auto max-w-4xl px-6 py-10 lg:px-10">
        <div className="space-y-8 text-base leading-7 text-slate-700 dark:text-slate-300 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-[#010a19] dark:[&_h2]:text-slate-50 [&_h2:first-child]:mt-0 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_a]:text-[#0063fe] [&_a]:underline [&_a]:underline-offset-2">
          {children}
        </div>
      </article>

      <PublicSiteFooter />
    </main>
  );
}
