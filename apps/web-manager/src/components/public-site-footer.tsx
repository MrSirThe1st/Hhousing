import Link from "next/link";

export default function PublicSiteFooter(): React.ReactElement {
  return (
    <footer className="border-t border-slate-200 bg-[#010A19] text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr] lg:px-10">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0063FE] text-sm font-bold text-white">HH</span>
            <span>
              <span className="block text-lg font-semibold tracking-tight">Hhousing</span>
              <span className="block text-xs uppercase tracking-[0.18em] text-slate-400">Logo provisoire</span>
            </span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-7 text-slate-300">
            Plateforme moderne d'exploitation locative pour les baux, la maintenance, les paiements, la communication et la diffusion publique des logements.
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
            <p>Propriétaires bailleurs</p>
            <p>Locataires</p>
            <p>Propriétaires investisseurs</p>
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