import Link from "next/link";
import BookDemoButton from "./book-demo-button";

export default function PublicLandingHero(): React.ReactElement {
  return (
    <section className="relative overflow-hidden bg-white text-[#1F3B63]">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.18]"
        style={{ backgroundImage: "url(/brand/search_hero_bg.png)" }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,#EAF2FA_0%,#EAF2FA_42%,rgba(234,242,250,0.55)_68%,rgba(255,255,255,0)_100%)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent via-white/70 to-white"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#8BB4E0]/30 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-20 top-1/3 h-72 w-72 rounded-full bg-[#A9C8E8]/28 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center px-4 py-14 text-center sm:px-6 sm:py-20 lg:px-10 lg:py-24">
        <div className="landing-fade-up flex flex-col items-center">
          <h1 className="max-w-3xl text-[1.65rem] font-bold leading-[1.15] tracking-tight text-[#1F3B63] sm:text-4xl md:text-5xl lg:text-[3.1rem] lg:leading-[1.12]">
            Gérez vos propriétés, recevez vos loyers et suivez vos locataires depuis une seule
            plateforme.
          </h1>

          <div className="mt-7 flex w-full max-w-md flex-col gap-3 sm:mt-9 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
            <BookDemoButton className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-[#4A86D4] px-7 text-sm font-semibold text-white shadow-md shadow-[#4A86D4]/25 transition hover:bg-[#3B73BC] sm:w-auto sm:text-base">
              Réserver une démo
            </BookDemoButton>
            <Link
              href="/signup"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-[#9CB8D6] bg-white/70 px-7 text-sm font-semibold text-[#1F3B63] backdrop-blur-sm transition hover:border-[#4A86D4] hover:bg-white sm:w-auto sm:text-base"
            >
              Démarrer gratuitement
            </Link>
          </div>

          <p className="mt-5 text-xs leading-relaxed text-[#5E7694] sm:mt-6 sm:text-sm">
            Gratuit sous 2 biens · Paiement Mobile Money ou par banque
          </p>
        </div>
      </div>
    </section>
  );
}
