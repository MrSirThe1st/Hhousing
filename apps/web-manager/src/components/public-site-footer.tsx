import Image from "next/image";
import Link from "next/link";
import BookDemoButton from "./book-demo-button";
import { buildWhatsAppContactUrl } from "../lib/public-contact";

export default function PublicSiteFooter(): React.ReactElement {
  const whatsappUrl =
    buildWhatsAppContactUrl(
      "Bonjour Haraka Property, je souhaite discuter de la gestion de mon portefeuille."
    ) ?? "https://wa.me/243994380039";

  return (
    <footer className="border-t border-white/15 bg-[#3A6BA8] text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 sm:py-12 lg:grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr_0.8fr] lg:gap-10 lg:px-10">
        <div className="sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3">
            <Image
              src="/brand/logo-white.jpg"
              alt="Haraka Property"
              width={44}
              height={44}
              className="h-10 w-10 rounded-md object-cover sm:h-11 sm:w-11"
            />
            <span className="text-lg font-semibold tracking-tight text-white">Haraka Property</span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-7 text-white/90">
            Plateforme de gestion locative pour vos contrats, réparations, paiements, communication et annonces de logements en RDC.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white sm:text-sm">Plateforme</p>
          <div className="mt-3 space-y-2.5 text-sm text-white/90 sm:mt-4 sm:space-y-3">
            <Link href="/#use-cases" className="block text-white/90 hover:text-white">Solutions</Link>
            <Link href="/#features" className="block text-white/90 hover:text-white">Fonctionnalités</Link>
            <Link href="/#pricing" className="block text-white/90 hover:text-white">Tarifs</Link>
            <BookDemoButton className="block text-left text-white/90 hover:text-white" />
            <Link href="/marketplace" className="block text-white/90 hover:text-white">Catalogue</Link>
            <Link href="/#faq" className="block text-white/90 hover:text-white">FAQ</Link>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white sm:text-sm">Solutions</p>
          <div className="mt-3 space-y-2.5 text-sm text-white/90 sm:mt-4 sm:space-y-3">
            <Link href="/#use-cases" className="block text-white/90 hover:text-white">Propriétaires</Link>
            <Link href="/#use-cases" className="block text-white/90 hover:text-white">Gestionnaires immobiliers</Link>
            <Link href="/mobile-app" className="block text-white/90 hover:text-white">Locataires</Link>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white sm:text-sm">Légal</p>
          <div className="mt-3 space-y-2.5 text-sm text-white/90 sm:mt-4 sm:space-y-3">
            <Link href="/politique-de-confidentialite" className="block text-white/90 hover:text-white">Politique de confidentialité</Link>
            <Link href="/conditions-utilisation" className="block text-white/90 hover:text-white">Conditions d&apos;utilisation</Link>
            <Link href="/suppression-donnees" className="block text-white/90 hover:text-white">Suppression des données</Link>
            <Link href="/support" className="block text-white/90 hover:text-white">Support</Link>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white sm:text-sm">Accès</p>
          <div className="mt-3 space-y-2.5 text-sm text-white/90 sm:mt-4 sm:space-y-3">
            <Link href="/login" className="block text-white/90 hover:text-white">Se connecter</Link>
            <Link href="/signup" className="block text-white/90 hover:text-white">Créer un compte</Link>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-white/90 hover:text-white"
            >
              WhatsApp
            </a>
            <Link href="/marketplace" className="block text-white/90 hover:text-white">Catalogue</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
