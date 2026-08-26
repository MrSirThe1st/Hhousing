import Image from "next/image";
import Link from "next/link";

export default function PublicLandingHero(): React.ReactElement {
  return (
    <section className="relative overflow-hidden bg-[#010A19] text-white">
      <div
        className="pointer-events-none absolute inset-0 landing-hero-glow"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)",
          backgroundSize: "32px 32px"
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 bg-cover bg-center opacity-25 lg:block"
        style={{ backgroundImage: "url(/brand/search_hero_bg.png)" }}
        aria-hidden="true"
      />

      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-8 px-4 py-10 sm:gap-10 sm:px-6 sm:py-14 lg:min-h-[min(88vh,52rem)] lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:px-10 lg:py-20">
        <div className="landing-fade-up">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Image
              src="/brand/haraka-pay-logo.svg"
              alt=""
              width={52}
              height={52}
              className="h-10 w-10 sm:h-14 sm:w-14"
              priority
            />
            <p className="text-xl font-semibold tracking-tight text-white sm:text-3xl md:text-4xl">
              Haraka Property
            </p>
          </div>

          <h1 className="mt-6 max-w-xl text-[1.65rem] font-bold leading-[1.15] tracking-tight text-white sm:mt-8 sm:text-4xl md:text-5xl lg:text-[3.15rem] lg:leading-[1.12]">
            Logiciel de gestion locative pour bailleurs et gestionnaires modernes
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-blue-100/90 sm:mt-5 sm:text-lg">
            Moins de temps à jongler entre Excel, WhatsApp et les carnets. Plus de temps à gérer
            votre portefeuille — en RDC.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:mt-9 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href="/demo"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-white px-7 text-sm font-semibold text-[#0063FE] shadow-lg shadow-black/25 transition hover:bg-slate-100 sm:w-auto sm:text-base"
            >
              Réserver une démo
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-white/30 bg-white/5 px-7 text-sm font-semibold text-white backdrop-blur-sm transition hover:border-white/50 hover:bg-white/10 sm:w-auto sm:text-base"
            >
              Démarrer gratuitement
            </Link>
          </div>

          <p className="mt-5 text-xs leading-relaxed text-blue-100/70 sm:mt-6 sm:text-sm">
            Gratuit sous 2 biens · Paiement Mobile Money · Sans carte bancaire
          </p>
        </div>

        <div className="landing-fade-up-delay relative" aria-hidden="true">
          <div className="absolute -inset-6 rounded-[2rem] bg-[#0063FE]/30 blur-3xl" />
          <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white shadow-2xl shadow-black/40">
            <div className="flex items-center gap-2.5 border-b border-slate-100 bg-slate-50 px-4 py-3">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
              </div>
              <span className="text-xs font-medium text-slate-500">Tableau de bord · Haraka Property</span>
            </div>
            <div className="space-y-3 bg-white p-4 sm:p-5">
              <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-gradient-to-r from-[#eef4ff] to-[#f8fafc] px-4 py-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    Loyers du mois
                  </p>
                  <p className="mt-1 text-2xl font-bold text-[#010A19]">2 450 000 FC</p>
                </div>
                <div className="rounded-lg bg-emerald-100 p-2.5 text-emerald-700">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  { label: "Contrats actifs", value: "24" },
                  { label: "Payés", value: "18" },
                  { label: "En retard", value: "3", warn: true }
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                    <p className="text-[10px] font-medium text-slate-500 sm:text-[11px]">{stat.label}</p>
                    <p className={`mt-1 text-lg font-bold sm:text-xl ${stat.warn ? "text-amber-600" : "text-[#010A19]"}`}>
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {[
                  { title: "Appartement Gombe · Loyer reçu", tone: "ok" },
                  { title: "Villa Limete · Relance envoyée", tone: "warn" },
                  { title: "Immeuble Ngaliema · 2 demandes", tone: "info" }
                ].map((row) => (
                  <div
                    key={row.title}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5"
                  >
                    <div
                      className={`h-9 w-9 shrink-0 rounded-lg ${
                        row.tone === "ok"
                          ? "bg-emerald-100"
                          : row.tone === "warn"
                            ? "bg-amber-100"
                            : "bg-blue-100"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{row.title}</p>
                      <div className="mt-1.5 h-1.5 w-2/3 rounded-full bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
