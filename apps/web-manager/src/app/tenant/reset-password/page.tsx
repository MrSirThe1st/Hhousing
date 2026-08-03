"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const APP_STORE_URL =
  process.env.NEXT_PUBLIC_TENANT_APP_STORE_URL?.trim()
  || "https://apps.apple.com/app/hhousing";
const PLAY_STORE_URL =
  process.env.NEXT_PUBLIC_TENANT_PLAY_STORE_URL?.trim()
  || "https://play.google.com/store/apps/details?id=com.hhousing.tenant";

type PageState = "loading" | "form" | "success" | "error";

function EyeIcon({ open }: { open: boolean }): React.ReactElement {
  if (open) {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
      </svg>
    );
  }

  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

export default function TenantResetPasswordPage(): React.ReactElement {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pageState, setPageState] = useState<PageState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    const supabase = createSupabaseBrowserClient();

    async function bootstrap(): Promise<void> {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      if (!session) {
        setError("Ce lien de réinitialisation est invalide ou a expiré. Demandez un nouveau lien depuis l’application.");
        setPageState("error");
        return;
      }

      setPageState("form");
    }

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setPageState("form");
        setError(null);
      }
    });

    void bootstrap();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError(updateError.message || "Impossible de mettre à jour le mot de passe.");
        setBusy(false);
        return;
      }

      await supabase.auth.signOut();
      setPageState("success");
    } catch {
      setError("Impossible de mettre à jour le mot de passe. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F3F4FA] px-4 py-10 text-[#010a19]">
      <div className="w-full max-w-md">
        <div className="mb-5 flex flex-col items-center gap-2 text-center">
          <Image
            src="/brand/haraka-pay-logo.svg"
            alt="Haraka Property"
            width={72}
            height={72}
            className="h-[72px] w-[72px]"
            priority
          />
          <h1 className="text-[28px] font-bold leading-none text-[#0063FE]">Mon Espace</h1>
          {pageState === "form" ? (
            <p className="max-w-sm text-lg leading-6 text-[#6B7280]">
              Choisissez un nouveau mot de passe pour votre compte locataire.
            </p>
          ) : pageState === "success" ? (
            <p className="max-w-sm text-lg leading-6 text-[#6B7280]">
              Mot de passe mis à jour. Ouvrez l&apos;application pour vous connecter.
            </p>
          ) : pageState === "error" ? (
            <p className="max-w-sm text-lg leading-6 text-[#6B7280]">
              Impossible d&apos;ouvrir ce lien de réinitialisation.
            </p>
          ) : (
            <p className="max-w-sm text-lg leading-6 text-[#6B7280]">
              Vérification du lien…
            </p>
          )}
        </div>

        {pageState === "loading" ? (
          <div className="rounded-[14px] border border-[#C9CFDA] bg-[#F3F4F6] px-5 py-10 text-center text-sm text-[#6B7280]">
            Vérification du lien…
          </div>
        ) : null}

        {pageState === "error" ? (
          <div className="rounded-[14px] border border-red-200 bg-red-50 px-5 py-6">
            <h2 className="text-lg font-semibold text-red-800">Lien invalide</h2>
            <p className="mt-2 text-sm leading-6 text-red-700">{error}</p>
          </div>
        ) : null}

        {pageState === "form" ? (
          <div className="rounded-[14px] border border-[#C9CFDA] bg-[#F3F4F6] p-5">
            <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-semibold text-[#6B7280]">Nouveau mot de passe</span>
                <div className="flex min-h-[52px] items-center gap-2.5 rounded-[10px] border border-[#C9CFDA] bg-[#F3F4F6] px-3">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    placeholder="Au moins 8 caractères"
                    className="min-w-0 flex-1 border-0 bg-transparent py-3 text-[15px] text-[#010A19] outline-none placeholder:text-[#9CA3AF]"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="shrink-0 rounded-md p-1 text-[#9CA3AF] transition hover:bg-white/70 hover:text-[#6B7280]"
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[13px] font-semibold text-[#6B7280]">Confirmer le mot de passe</span>
                <div className="flex min-h-[52px] items-center gap-2.5 rounded-[10px] border border-[#C9CFDA] bg-[#F3F4F6] px-3">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    placeholder="Répétez le mot de passe"
                    className="min-w-0 flex-1 border-0 bg-transparent py-3 text-[15px] text-[#010A19] outline-none placeholder:text-[#9CA3AF]"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    className="shrink-0 rounded-md p-1 text-[#9CA3AF] transition hover:bg-white/70 hover:text-[#6B7280]"
                    aria-label={showConfirmPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    <EyeIcon open={showConfirmPassword} />
                  </button>
                </div>
              </label>

              {error ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              ) : null}

              <button
                type="submit"
                disabled={busy}
                className="flex min-h-[52px] w-full items-center justify-center rounded-[10px] bg-[#0063FE] text-[15px] font-semibold text-white transition hover:bg-[#0052d4] disabled:opacity-60"
              >
                {busy ? "Enregistrement…" : "Enregistrer le mot de passe"}
              </button>
            </form>
          </div>
        ) : null}

        {pageState === "success" ? (
          <div className="space-y-3 rounded-[14px] border border-[#C9CFDA] bg-[#F3F4F6] p-5">
            <p className="text-center text-sm leading-6 text-[#6B7280]">
              Téléchargez ou rouvrez Mon Espace, puis connectez-vous avec votre numéro et le nouveau mot de passe.
            </p>
            <a
              href={APP_STORE_URL}
              className="flex min-h-[48px] items-center justify-center rounded-[10px] bg-[#0063FE] text-sm font-semibold text-white"
            >
              App Store
            </a>
            <a
              href={PLAY_STORE_URL}
              className="flex min-h-[48px] items-center justify-center rounded-[10px] border border-[#C9CFDA] bg-white text-sm font-semibold text-[#010a19]"
            >
              Google Play
            </a>
          </div>
        ) : null}
      </div>
    </main>
  );
}
