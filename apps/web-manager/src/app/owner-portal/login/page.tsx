"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OwnerPortalLogoLink from "@/components/owner-portal/platform-logo-link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function OwnerPortalLoginPage(): React.ReactElement {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      setError("Connexion impossible. Verifiez vos identifiants.");
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
          <OwnerPortalLogoLink subtitle="Acces lecture seule pour les owners invites" />
          <h1 className="mt-10 text-4xl font-semibold tracking-tight">Suivez vos actifs sans operer la plateforme.</h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-slate-300">
            Ce portail est reserve aux owners invites par leur gestionnaire. Vous y consultez vos biens,
            vos encaissements, vos indicateurs d'occupation et vos rapports, sans acces d'ecriture.
          </p>
          <div className="mt-10 space-y-4 text-sm text-slate-200">
            <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4">Portefeuille owner en lecture seule</div>
            <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4">Paiements et performance centralises</div>
            <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4">Acces par invitation email uniquement</div>
          </div>
        </section>

        <section className="rounded-4xl border border-slate-200 bg-white px-8 py-10 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.35)]">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Owner portal</p>
          <h2 className="mt-3 text-3xl font-semibold text-slate-950">Connexion</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Utilisez l'email qui a recu l'invitation owner. Si vous n'avez pas encore active votre acces,
            ouvrez d'abord le lien d'invitation recu par email.
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

            <label className="block text-sm text-slate-700">
              Mot de passe
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1.5 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/20"
                placeholder="••••••••"
              />
            </label>

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
