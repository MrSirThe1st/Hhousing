"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import PlatformLogoLink from "@/components/platform-logo-link";
import OwnerPortalLogoLink from "@/components/owner-portal/platform-logo-link";

function ResetPasswordContent(): React.ReactElement {
  const searchParams = useSearchParams();
  const router = useRouter();
  const type = searchParams.get("type");
  const isOwner = type === "owner";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(3);

  // Auto-redirect timer on success
  useEffect(() => {
    if (!success) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push(isOwner ? "/owner-portal/dashboard" : "/dashboard");
          router.refresh();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [success, isOwner, router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);

    // Validate password constraints
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message || "Une erreur est survenue lors de la réinitialisation.");
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || "Une erreur inattendue est survenue.");
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
    ? "mt-1.5 w-full rounded-2xl border border-slate-300 bg-slate-50 pl-4 pr-10 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/20"
    : "w-full rounded-lg border border-slate-200 bg-white pl-3.5 pr-10 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15";

  return (
    <main className={mainClass} style={wrapperStyle}>
      {!isOwner && <div className="absolute inset-0 overflow-hidden pointer-events-none bg-slate-50/30" />}

      <div className="relative w-full max-w-md my-auto flex flex-col gap-4">
        <div className="text-center">
          {isOwner ? (
            <div className="flex justify-center mb-6">
              <OwnerPortalLogoLink subtitle="Réinitialisation de mot de passe" centered />
            </div>
          ) : (
            <div className="mb-4">
              <PlatformLogoLink centered subtitle="Nouveau mot de passe" />
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
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Nouveau mot de passe</h2>
              <p className="mt-2 text-sm text-slate-600">
                Définissez votre nouveau mot de passe sécurisé pour accéder au portail.
              </p>
            </div>
          )}

          {!isOwner && (
            <div className="mb-4">
              <h1 className="text-xl font-bold text-slate-900">Nouveau mot de passe</h1>
              <p className="mt-1 text-xs text-slate-600">
                Saisissez votre nouveau mot de passe ci-dessous.
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
                  <p className="font-semibold">Mot de passe mis à jour !</p>
                  <p>Votre mot de passe a été modifié avec succès.</p>
                  <p className="text-[10px] text-green-700/80 mt-2">
                    Redirection vers votre tableau de bord dans {countdown} seconde{countdown > 1 ? "s" : ""}...
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => router.push(isOwner ? "/owner-portal/dashboard" : "/dashboard")}
                className={buttonClass}
              >
                Accéder au tableau de bord
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="password"
                  className={`block text-xs font-semibold text-slate-700 ${isOwner ? "mb-1.5" : "mb-1"}`}
                >
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                    placeholder="••••••••"
                    disabled={loading}
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

              <div>
                <label
                  htmlFor="confirmPassword"
                  className={`block text-xs font-semibold text-slate-700 ${isOwner ? "mb-1.5" : "mb-1"}`}
                >
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={inputClass}
                    placeholder="••••••••"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                    aria-label={showConfirmPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showConfirmPassword ? (
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

              {error !== null && (
                <div className="flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 px-3.5 py-2">
                  <svg className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}

              <button type="submit" disabled={loading} className={buttonClass}>
                {loading ? "Réinitialisation..." : "Enregistrer le mot de passe"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

function ResetPasswordFallback(): React.ReactElement {
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

export default function ResetPasswordPage(): React.ReactElement {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
