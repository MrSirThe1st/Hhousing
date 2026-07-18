"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const APP_STORE_URL =
  process.env.NEXT_PUBLIC_TENANT_APP_STORE_URL?.trim()
  || "https://apps.apple.com/app/hhousing";
const PLAY_STORE_URL =
  process.env.NEXT_PUBLIC_TENANT_PLAY_STORE_URL?.trim()
  || "https://play.google.com/store/apps/details?id=com.hhousing.tenant";

type InvitePreview = {
  tenantFullName: string;
  organizationName: string;
};

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

export default function InvitePage(): React.ReactElement {
  const [token, setToken] = useState("");
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pageState, setPageState] = useState<PageState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const nextToken = searchParams.get("token")?.trim() ?? "";
    setToken(nextToken);

    if (!nextToken) {
      setError("Lien d'invitation invalide.");
      setPageState("error");
      return;
    }

    async function loadPreview(): Promise<void> {
      try {
        const response = await fetch(
          `/api/mobile/invitations/validate?token=${encodeURIComponent(nextToken)}`
        );
        const payload = (await response.json()) as {
          success: boolean;
          error?: string;
          data?: { invitation?: InvitePreview & Record<string, unknown> };
        };

        if (!payload.success || !payload.data?.invitation) {
          setError(payload.error ?? "Invitation introuvable ou expirée.");
          setPageState("error");
          return;
        }

        setPreview({
          tenantFullName: payload.data.invitation.tenantFullName,
          organizationName: payload.data.invitation.organizationName
        });
        setPageState("form");
      } catch {
        setError("Impossible de charger l'invitation.");
        setPageState("error");
      }
    }

    void loadPreview();
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
      const response = await fetch("/api/mobile/invitations/accept", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password })
      });
      const payload = (await response.json()) as { success: boolean; error?: string };

      if (!payload.success) {
        setError(payload.error ?? "Activation impossible.");
        setBusy(false);
        return;
      }

      setPageState("success");
    } catch {
      setError("Activation impossible. Réessayez.");
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
          {pageState === "form" && preview ? (
            <p className="max-w-sm text-lg leading-6 text-[#6B7280]">
              Bonjour {preview.tenantFullName}. Créez votre mot de passe pour activer votre compte.
            </p>
          ) : pageState === "success" ? (
            <p className="max-w-sm text-lg leading-6 text-[#6B7280]">
              Votre compte est prêt. Téléchargez l&apos;application pour vous connecter.
            </p>
          ) : pageState === "error" ? (
            <p className="max-w-sm text-lg leading-6 text-[#6B7280]">
              Impossible d&apos;ouvrir cette invitation.
            </p>
          ) : (
            <p className="max-w-sm text-lg leading-6 text-[#6B7280]">
              Chargement de votre invitation…
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

        {pageState === "form" && preview ? (
          <div className="rounded-[14px] border border-[#C9CFDA] bg-[#F3F4F6] p-5">
            <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280]">
              {preview.organizationName}
            </p>

            <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-semibold text-[#6B7280]">Mot de passe</span>
                <div className="flex min-h-[52px] items-center gap-2.5 rounded-[10px] border border-[#C9CFDA] bg-[#F3F4F6] px-3">
                  <svg className="h-[18px] w-[18px] shrink-0 text-[#9CA3AF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
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
                  <svg className="h-[18px] w-[18px] shrink-0 text-[#9CA3AF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
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
                    aria-label={showConfirmPassword ? "Masquer la confirmation" : "Afficher la confirmation"}
                  >
                    <EyeIcon open={showConfirmPassword} />
                  </button>
                </div>
              </label>

              {error ? (
                <p className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              ) : null}

              <button
                type="submit"
                disabled={busy}
                className="flex min-h-[58px] w-full items-center justify-center rounded-[10px] bg-[#0063FE] px-4 text-[22px] font-bold text-white transition hover:bg-[#0052d4] disabled:opacity-65"
              >
                {busy ? "Activation…" : "Confirmer"}
              </button>
            </form>
          </div>
        ) : null}

        {pageState === "success" ? (
          <div className="rounded-[14px] border border-[#C9CFDA] bg-[#F3F4F6] p-5">
            <div className="mb-4 flex justify-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </span>
            </div>
            <h2 className="text-center text-xl font-bold text-[#010a19]">Compte activé !</h2>
            <p className="mt-2 text-center text-sm leading-6 text-[#6B7280]">
              Connectez-vous dans l&apos;application avec votre numéro de téléphone et le mot de passe que vous venez de créer.
            </p>

            <div className="mt-6 space-y-3">
              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[52px] w-full items-center justify-center rounded-[10px] bg-[#0063FE] px-4 text-sm font-bold text-white transition hover:bg-[#0052d4]"
              >
                Télécharger sur Google Play
              </a>
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[52px] w-full items-center justify-center rounded-[10px] border border-[#C9CFDA] bg-white px-4 text-sm font-bold text-[#010a19] transition hover:bg-slate-50"
              >
                Télécharger sur l&apos;App Store
              </a>
            </div>
          </div>
        ) : null}

        {pageState === "form" ? (
          <p className="mt-5 text-center text-sm text-[#6B7280]">
            Après activation, utilisez votre numéro <span className="font-semibold text-[#0063FE]">+243</span> pour vous connecter.
          </p>
        ) : null}
      </div>
    </main>
  );
}
