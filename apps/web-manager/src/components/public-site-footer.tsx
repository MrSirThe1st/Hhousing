import Image from "next/image";
import Link from "next/link";

export default function PublicSiteFooter(): React.ReactElement {
  return (
    <footer className="border-t border-slate-200 bg-[#010A19] text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr] lg:px-10">
        <div>
          <div className="flex items-center gap-3">
            <Image src="/brand/haraka-pay-logo.svg" alt="Haraka Property" width={44} height={44} className="h-11 w-11" />
            <span>
              <span className="block text-lg font-semibold tracking-tight">Haraka Property</span>
              <span className="block text-xs uppercase tracking-[0.18em] text-slate-400">Gestion de vos locations</span>
            </span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-7 text-slate-300">
            Plateforme de gestion locative pour vos contrats, réparations, paiements, communication et annonces de logements en RDC.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">Plateforme</p>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            <Link href="/#features" className="block hover:text-white">Fonctionnalités</Link>
            <Link href="/#pricing" className="block hover:text-white">Tarification</Link>
            <Link href="/#faq" className="block hover:text-white">FAQ</Link>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">Profils</p>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            <p>Gestionnaires immobiliers</p>
            <p>Bailleurs</p>
            <p>Locataires</p>
            <p>Investisseurs immobiliers</p>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">Légal</p>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            <Link href="/politique-de-confidentialite" className="block hover:text-white">Politique de confidentialité</Link>
            <Link href="/conditions-utilisation" className="block hover:text-white">Conditions d&apos;utilisation</Link>
            <Link href="/suppression-donnees" className="block hover:text-white">Suppression des données</Link>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">Accès</p>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            <Link href="/login" className="block hover:text-white">Connexion</Link>
            <Link href="/signup" className="block hover:text-white">Créer un compte</Link>
            <Link href="/marketplace" className="block hover:text-white">Toutes les annonces</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}