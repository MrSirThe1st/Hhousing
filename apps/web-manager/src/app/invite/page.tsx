"use client";

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

export default function InvitePage(): React.ReactElement {
  const [token, setToken] = useState("");
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
    <main className="min-h-screen bg-[#f7f8fa] px-6 py-16 text-[#010a19]">
      <div className="mx-auto w-full max-w-md">
        <p className="text-sm font-semibold tracking-[0.2em] text-[#0063fe]">HARAKA</p>

        {pageState === "loading" ? (
          <p className="mt-10 text-sm text-slate-500">Chargement de votre invitation…</p>
        ) : null}

        {pageState === "error" ? (
          <div className="mt-10">
            <h1 className="text-2xl font-semibold tracking-tight">Lien invalide</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">{error}</p>
          </div>
        ) : null}

        {pageState === "form" && preview ? (
          <div className="mt-10">
            <h1 className="text-2xl font-semibold tracking-tight">Bienvenue sur Haraka</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Bonjour {preview.tenantFullName}. Créez votre mot de passe pour sécuriser votre compte.
            </p>
            <p className="mt-1 text-xs text-slate-400">{preview.organizationName}</p>

            <form onSubmit={(event) => void handleSubmit(event)} className="mt-8 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Mot de passe</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15"
                  required
                  minLength={8}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Confirmer le mot de passe</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15"
                  required
                  minLength={8}
                />
              </label>

              {error ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              ) : null}

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-[#0063fe] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0052d4] disabled:opacity-60"
              >
                {busy ? "Activation…" : "Confirmer"}
              </button>
            </form>
          </div>
        ) : null}

        {pageState === "success" ? (
          <div className="mt-10">
            <h1 className="text-2xl font-semibold tracking-tight">Compte activé !</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Téléchargez l&apos;application pour suivre vos paiements.
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Connectez-vous avec votre numéro de téléphone et le mot de passe que vous venez de créer.
            </p>

            <div className="mt-8 space-y-3">
              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center rounded-lg bg-[#0063fe] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0052d4]"
              >
                Télécharger sur Google Play
              </a>
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-[#010a19] transition hover:bg-slate-50"
              >
                Télécharger sur l&apos;App Store
              </a>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
