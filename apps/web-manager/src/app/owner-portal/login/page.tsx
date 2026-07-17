"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import OwnerPortalLogoLink from "@/components/owner-portal/platform-logo-link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function OwnerPortalLoginPage(): React.ReactElement {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      setError("Connexion impossible. Vérifiez vos identifiants.");
      setLoading(false);
      return;
    }

    router.push("/owner-portal/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(0,99,254,0.10),transparent_30%),linear-gradient(180deg,#f8fafc_0%,#eef4fb_100%)] px-6 py-12">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-4xl bg-[#03132b] px-8 py-10 text-white shadow-[0_24px_70px_-40px_rgba(3,19,43,0.85)]">
          <OwnerPortalLogoLink subtitle="Accès lecture seule pour les owners invités" />
          <h1 className="mt-10 text-4xl font-semibold tracking-tight">Suivez vos actifs sans opérer la plateforme.</h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-slate-300">
            Ce portail est réservé aux owners invités par leur gestionnaire. Vous y consultez vos biens,
            vos encaissements, vos indicateurs d'occupation et vos rapports, sans accès d'écriture.
          </p>
          <div className="mt-10 space-y-4 text-sm text-slate-200">
            <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4">Vos biens en lecture seule</div>
            <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4">Paiements et performance centralisés</div>
            <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4">Accès par invitation email uniquement</div>
          </div>
        </section>

        <section className="rounded-4xl border border-slate-200 bg-white px-8 py-10 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.35)]">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Owner portal</p>
          <h2 className="mt-3 text-3xl font-semibold text-slate-950">Connexion</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Utilisez l'email qui a reçu l'invitation owner. Si vous n'avez pas encore activé votre accès,
            ouvrez d'abord le lien d'invitation reçu par email.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="block text-sm text-slate-700">
              Adresse email
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1.5 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/20"
                placeholder="owner@example.com"
              />
            </label>

            <div className="block text-sm text-slate-700">
              <div className="flex justify-between items-center">
                <span>Mot de passe</span>
                <Link
                  href="/forgot-password?type=owner"
                  className="text-xs font-medium text-[#0063fe] hover:text-[#0052d4] transition"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
              <div className="relative mt-1.5">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 pl-4 pr-10 py-3 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/20"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error ? (
              <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#0063fe] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0052d4] disabled:opacity-60"
            >
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
