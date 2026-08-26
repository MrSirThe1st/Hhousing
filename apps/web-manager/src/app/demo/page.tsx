import type { Metadata } from "next";
import Link from "next/link";
import PublicDemoRequestForm from "../../components/public-demo-request-form";
import PublicSiteFooter from "../../components/public-site-footer";
import PublicSiteNavbar from "../../components/public-site-navbar";
import PublicWhatsAppContact from "../../components/public-whatsapp-contact";

export const metadata: Metadata = {
  title: "Réserver une démo — Haraka Property",
  description:
    "Planifiez une démonstration gratuite de Haraka Property, le logiciel de gestion locative pour bailleurs et gestionnaires en RDC."
};

export default function DemoPage(): React.ReactElement {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <PublicSiteNavbar />
      <section className="border-b border-slate-200 bg-[#010A19] px-4 py-10 text-white sm:px-6 sm:py-14 lg:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">
            Démonstration
          </p>
          <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-4xl">
            Réservez une démo Haraka Property
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-blue-100/85 sm:text-base">
            En quelques minutes, découvrez comment centraliser loyers, contrats, maintenance et
            communication — adapté à la RDC.
          </p>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-12 lg:px-10 lg:py-16">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:gap-10">
          <div>
            <h2 className="text-lg font-bold text-[#010A19] sm:text-xl">Ce que vous verrez</h2>
            <ul className="mt-5 space-y-3 text-sm text-slate-600">
              {[
                "Tableau de bord loyers, occupation et retards",
                "Création de biens, logements et contrats",
                "Suivi des paiements et Mobile Money",
                "Demandes de maintenance et messagerie",
                "Espace locataire sur application mobile"
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <svg
                    className="mt-0.5 h-5 w-5 shrink-0 text-[#0063FE]"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-8 text-sm text-slate-500">
              Déjà un compte ?{" "}
              <Link href="/login" className="font-semibold text-[#0063FE] hover:underline">
                Se connecter
              </Link>
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-6 lg:p-8">
            <PublicDemoRequestForm />
          </div>
        </div>
      </section>

      <PublicWhatsAppContact />
      <PublicSiteFooter />
    </main>
  );
}
