import Image from "next/image";
import Link from "next/link";

export default function PublicLandingHero(): React.ReactElement {
  return (
    <section className="relative overflow-hidden bg-[#EAF2FA] text-[#1F3B63]">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.22]"
        style={{ backgroundImage: "url(/brand/search_hero_bg.png)" }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#D7E7F7]/90 via-[#EAF2FA]/92 to-white"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#8BB4E0]/35 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-[#A9C8E8]/40 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center px-4 py-14 text-center sm:px-6 sm:py-20 lg:px-10 lg:py-24">
        <div className="landing-fade-up flex flex-col items-center">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Image
              src="/brand/haraka-pay-logo.svg"
              alt=""
              width={52}
              height={52}
              className="h-10 w-10 sm:h-14 sm:w-14"
              priority
            />
            <p className="text-xl font-semibold tracking-tight text-[#1F3B63] sm:text-3xl md:text-4xl">
              Haraka Property
            </p>
          </div>

          <h1 className="mt-6 max-w-3xl text-[1.65rem] font-bold leading-[1.15] tracking-tight text-[#1F3B63] sm:mt-8 sm:text-4xl md:text-5xl lg:text-[3.1rem] lg:leading-[1.12]">
            Logiciel de gestion locative pour bailleurs et gestionnaires modernes
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#4A6484] sm:mt-5 sm:text-lg">
            Moins de temps à jongler entre Excel, WhatsApp et les carnets. Plus de temps à gérer
            votre portefeuille — en RDC.
          </p>

          <div className="mt-7 flex w-full max-w-md flex-col gap-3 sm:mt-9 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
            <Link
              href="/demo"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#4A86D4] px-7 text-sm font-semibold text-white shadow-md shadow-[#4A86D4]/25 transition hover:bg-[#3B73BC] sm:w-auto sm:text-base"
            >
              Réserver une démo
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-[#9CB8D6] bg-white/70 px-7 text-sm font-semibold text-[#1F3B63] backdrop-blur-sm transition hover:border-[#4A86D4] hover:bg-white sm:w-auto sm:text-base"
            >
              Démarrer gratuitement
            </Link>
          </div>

          <p className="mt-5 text-xs leading-relaxed text-[#5E7694] sm:mt-6 sm:text-sm">
            Gratuit sous 2 biens · Paiement Mobile Money · Sans carte bancaire
          </p>
        </div>
      </div>
    </section>
  );
}
