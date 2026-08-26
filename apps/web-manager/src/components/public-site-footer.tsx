import Image from "next/image";
import Link from "next/link";
import BookDemoButton from "./book-demo-button";

export default function PublicSiteFooter(): React.ReactElement {
  return (
    <footer className="border-t border-slate-200 bg-[#3A6BA8] text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 sm:py-12 lg:grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr_0.8fr] lg:gap-10 lg:px-10">
        <div className="sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3">
            <Image src="/brand/haraka-pay-logo.svg" alt="Haraka Property" width={44} height={44} className="h-10 w-10 sm:h-11 sm:w-11" />
            <span className="text-lg font-semibold tracking-tight">Haraka Property</span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-7 text-slate-300">
            Plateforme de gestion locative pour vos contrats, réparations, paiements, communication et annonces de logements en RDC.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 sm:text-sm">Plateforme</p>
          <div className="mt-3 space-y-2.5 text-sm text-slate-300 sm:mt-4 sm:space-y-3">
            <Link href="/#use-cases" className="block hover:text-white">Solutions</Link>
            <Link href="/#features" className="block hover:text-white">Fonctionnalités</Link>
            <Link href="/#pricing" className="block hover:text-white">Tarifs</Link>
            <BookDemoButton className="block text-left hover:text-white" />
            <Link href="/marketplace" className="block hover:text-white">Catalogue</Link>
            <Link href="/#faq" className="block hover:text-white">FAQ</Link>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 sm:text-sm">Solutions</p>
          <div className="mt-3 space-y-2.5 text-sm text-slate-300 sm:mt-4 sm:space-y-3">
            <Link href="/#use-cases" className="block hover:text-white">Propriétaires</Link>
            <Link href="/#use-cases" className="block hover:text-white">Gestionnaires immobiliers</Link>
            <Link href="/mobile-app" className="block hover:text-white">Locataires</Link>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 sm:text-sm">Légal</p>
          <div className="mt-3 space-y-2.5 text-sm text-slate-300 sm:mt-4 sm:space-y-3">
            <Link href="/politique-de-confidentialite" className="block hover:text-white">Politique de confidentialité</Link>
            <Link href="/conditions-utilisation" className="block hover:text-white">Conditions d&apos;utilisation</Link>
            <Link href="/suppression-donnees" className="block hover:text-white">Suppression des données</Link>
            <Link href="/support" className="block hover:text-white">Support</Link>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 sm:text-sm">Accès</p>
          <div className="mt-3 space-y-2.5 text-sm text-slate-300 sm:mt-4 sm:space-y-3">
            <Link href="/login" className="block hover:text-white">Se connecter</Link>
            <Link href="/signup" className="block hover:text-white">Créer un compte</Link>
            <Link href="/#contact" className="block hover:text-white">WhatsApp</Link>
            <Link href="/marketplace" className="block hover:text-white">Catalogue</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
