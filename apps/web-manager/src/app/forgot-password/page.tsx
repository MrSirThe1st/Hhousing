"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import PlatformLogoLink from "@/components/platform-logo-link";
import OwnerPortalLogoLink from "@/components/owner-portal/platform-logo-link";

function ForgotPasswordContent(): React.ReactElement {
  const searchParams = useSearchParams();
  const type = searchParams.get("type");
  const isOwner = type === "owner";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const origin = window.location.origin;
      
      // Determine appropriate redirect path based on type
      const nextPath = isOwner ? "/reset-password?type=owner" : "/reset-password";
      const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (resetError) {
        setError(resetError.message || "Une erreur est survenue lors de l'envoi de l'e-mail.");
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || "Une erreur inattendue est survenue.");
    } finally {
      setLoading(false);
    }
  }

  // Styles based on operator type
  const mainClass = isOwner
    ? "min-h-screen bg-[radial-gradient(circle_at_top,rgba(0,99,254,0.10),transparent_30%),linear-gradient(180deg,#f8fafc_0%,#eef4fb_100%)] px-6 py-12 flex items-center justify-center"
    : "min-h-screen flex items-center justify-center bg-white px-4 py-4 relative";

  const wrapperStyle = isOwner
    ? {}
    : {
        backgroundImage: "url('/brand/MOTIFS.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      };

  const cardClass = isOwner
    ? "w-full max-w-md rounded-4xl border border-slate-200 bg-white px-8 py-10 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.35)]"
    : "relative w-full max-w-md bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6 my-auto";

  const buttonClass = isOwner
    ? "w-full rounded-full bg-[#0063fe] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0052d4] disabled:opacity-60 shadow-lg shadow-blue-500/10 focus:outline-none focus:ring-2 focus:ring-[#0063fe]/40"
    : "w-full rounded-lg bg-[#0063fe] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-[#0052d4] hover:shadow-blue-500/35 focus:outline-none focus:ring-2 focus:ring-[#0063fe]/40 disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none";

  const inputClass = isOwner
    ? "mt-1.5 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/20"
    : "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15";

  return (
    <main className={mainClass} style={wrapperStyle}>
      {!isOwner && <div className="absolute inset-0 overflow-hidden pointer-events-none bg-slate-50/30" />}

      <div className="relative w-full max-w-md my-auto flex flex-col gap-4">
        <div className="text-center">
          {isOwner ? (
            <div className="flex justify-center mb-6">
              <OwnerPortalLogoLink subtitle="Récupération d'accès Owner" centered />
            </div>
          ) : (
            <div className="mb-4">
              <PlatformLogoLink centered subtitle="Retour à la connexion" />
              <div className="mt-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/50 px-4 py-1 text-xs font-semibold text-blue-700">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Espace gestionnaire
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={cardClass}>
          {isOwner && (
            <div className="mb-6">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Owner portal</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Mot de passe oublié</h2>
              <p className="mt-2 text-sm text-slate-600">
                Saisissez votre e-mail de connexion. Nous vous enverrons un lien sécurisé pour redéfinir votre mot de passe.
              </p>
            </div>
          )}

          {!isOwner && (
            <div className="mb-4">
              <h1 className="text-xl font-bold text-slate-900">Mot de passe oublié</h1>
              <p className="mt-1 text-xs text-slate-600">
                Saisissez votre e-mail pour recevoir un lien de réinitialisation.
              </p>
            </div>
          )}

          {success ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg bg-green-50 border border-green-200 px-4 py-3.5">
                <svg className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-xs text-green-800 space-y-1">
                  <p className="font-semibold">E-mail envoyé avec succès !</p>
                  <p>
                    Si un compte correspond à <strong>{email}</strong>, vous recevrez un message contenant un lien pour réinitialiser votre mot de passe.
                  </p>
                  <p className="text-[10px] text-green-700/80 mt-1">
                    Pensez à vérifier votre dossier de courrier indésirable (spams).
                  </p>
                </div>
              </div>

              <Link
                href={isOwner ? "/owner-portal/login" : "/login"}
                className={`block text-center text-xs font-semibold text-slate-600 hover:text-slate-800 transition py-2`}
              >
                Retour à la page de connexion
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className={`block text-xs font-semibold text-slate-700 ${isOwner ? "mb-1.5" : "mb-1"}`}
                >
                  Adresse e-mail
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="vous@example.com"
                  disabled={loading}
                />
              </div>

              {error !== null && (
                <div className="flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 px-3.5 py-2">
                  <svg className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}

              <button type="submit" disabled={loading} className={buttonClass}>
                {loading ? "Envoi du lien..." : "Envoyer le lien de réinitialisation"}
              </button>

              <div className="pt-2 text-center">
                <Link
                  href={isOwner ? "/owner-portal/login" : "/login"}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Retourner à la connexion
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

function ForgotPasswordFallback(): React.ReactElement {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center p-6 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-sm w-full">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 bg-slate-100 rounded-full" />
          <div className="h-4 w-48 bg-slate-100 rounded" />
          <div className="h-8 w-full bg-slate-100 rounded-lg mt-2" />
        </div>
      </div>
    </main>
  );
}

export default function ForgotPasswordPage(): React.ReactElement {
  return (
    <Suspense fallback={<ForgotPasswordFallback />}>
      <ForgotPasswordContent />
    </Suspense>
  );
}
