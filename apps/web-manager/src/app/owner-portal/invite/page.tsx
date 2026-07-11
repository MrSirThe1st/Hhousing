"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { OwnerInvitationPreview } from "@hhousing/api-contracts";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

function LoadingPanel(): React.ReactElement {
  return (
    <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-500">
      Vérification de l'invitation...
    </div>
  );
}

function OwnerInviteContent(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [invitation, setInvitation] = useState<OwnerInvitationPreview | null>(null);
  const [mode, setMode] = useState<"create" | "login">("create");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [existingPassword, setExistingPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showExistingPassword, setShowExistingPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Lien d'invitation invalide.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadPreview(): Promise<void> {
      setLoading(true);
      const response = await fetch(`/api/owner-portal/auth/owner-invitations/validate?token=${encodeURIComponent(token)}`);
      const payload = (await response.json()) as ApiResult<{ invitation: OwnerInvitationPreview }>;

      if (cancelled) {
        return;
      }

      if (!payload.success || !payload.data) {
        setError(payload.error ?? "Invitation introuvable.");
        setLoading(false);
        return;
      }

      setInvitation(payload.data.invitation);
      setMode(payload.data.invitation.accountExists ? "login" : "create");
      setLoading(false);
    }

    void loadPreview();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleCreateAccount(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!invitation) {
      return;
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setBusy(true);
    setError(null);

    const response = await fetch("/api/owner-portal/auth/owner-invitations/accept", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        token,
        fullName,
        password
      })
    });
    const payload = (await response.json()) as ApiResult<{ userId: string }>;

    if (!payload.success) {
      setError(payload.error ?? "Activation impossible.");
      setBusy(false);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const signInResult = await supabase.auth.signInWithPassword({
      email: invitation.email,
      password
    });

    if (signInResult.error) {
      setError(signInResult.error.message);
      setBusy(false);
      return;
    }

    router.push("/owner-portal/dashboard");
    router.refresh();
  }

  async function handleLoginAndAccept(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!invitation) {
      return;
    }

    setBusy(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const signInResult = await supabase.auth.signInWithPassword({
      email: invitation.email,
      password: existingPassword
    });

    if (signInResult.error) {
      setError("Connexion impossible. Vérifiez votre mot de passe.");
      setBusy(false);
      return;
    }

    const response = await fetch("/api/owner-portal/auth/owner-invitations/accept", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ token })
    });
    const payload = (await response.json()) as ApiResult<{ userId: string }>;

    if (!payload.success) {
      setError(payload.error ?? "Activation impossible.");
      setBusy(false);
      return;
    }

    router.push("/owner-portal/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(0,99,254,0.10),transparent_35%),linear-gradient(180deg,#f8fafc_0%,#eef3f8_100%)] px-6 py-12">
      <div className="mx-auto max-w-5xl rounded-4xl border border-slate-200 bg-white shadow-[0_24px_70px_-40px_rgba(15,23,42,0.35)]">
        <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="border-b border-slate-200 bg-slate-950 px-6 py-8 text-white lg:border-b-0 lg:border-r">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Invitation owner</p>
            <h1 className="mt-3 text-3xl font-semibold">Activez votre accès lecture seule</h1>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              Votre accès owner reste strictement consultatif. Vous pourrez suivre vos biens,
              les paiements et les rapports liés à votre portefeuille, sans modifier les données.
            </p>

            {invitation ? (
              <div className="mt-8 rounded-3xl bg-white/10 p-5 text-sm text-slate-200">
                <p><strong>Owner:</strong> {invitation.ownerName}</p>
                <p className="mt-2"><strong>Organisation:</strong> {invitation.organizationName}</p>
                <p className="mt-2"><strong>Email invité:</strong> {invitation.email}</p>
                <p className="mt-2"><strong>Expiration:</strong> {new Date(invitation.expiresAtIso).toLocaleDateString("fr-FR")}</p>
              </div>
            ) : null}
          </section>

          <section className="px-6 py-8">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Activation</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">Finaliser l'invitation</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {invitation?.accountExists
                ? "Un compte Haraka Property existe déjà pour cet email. Connectez-vous avec ce compte, puis activez votre accès owner."
                : "Aucun compte Haraka Property n'existe encore pour cet email. Créez votre mot de passe puis activez votre accès owner."}
            </p>

            {loading ? <LoadingPanel /> : null}

            {!loading && invitation ? (
              <div className="mt-6 space-y-5">
                <div className="inline-flex rounded-full bg-slate-100 p-1 text-sm">
                  <button
                    type="button"
                    onClick={() => setMode("create")}
                    disabled={invitation.accountExists}
                    className={`rounded-full px-4 py-2 font-medium transition ${mode === "create" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"} ${invitation.accountExists ? "cursor-not-allowed opacity-40" : ""}`}
                  >
                    Créer un compte
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className={`rounded-full px-4 py-2 font-medium transition ${mode === "login" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}
                  >
                    Se connecter
                  </button>
                </div>

                {mode === "create" ? (
                  <form className="space-y-4" onSubmit={handleCreateAccount}>
                    <label className="block text-sm text-slate-700">
                      Nom complet
                      <input
                        className="mt-1.5 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/20"
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        required
                        disabled={invitation.accountExists}
                      />
                    </label>

                    <div className="block text-sm text-slate-700">
                      <span>Mot de passe</span>
                      <div className="relative mt-1.5">
                        <input
                          className="w-full rounded-2xl border border-slate-300 pl-4 pr-10 py-3 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/20"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          minLength={8}
                          required
                          disabled={invitation.accountExists}
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

                    <div className="block text-sm text-slate-700">
                      <span>Confirmer le mot de passe</span>
                      <div className="relative mt-1.5">
                        <input
                          className="w-full rounded-2xl border border-slate-300 pl-4 pr-10 py-3 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/20"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(event) => setConfirmPassword(event.target.value)}
                          minLength={8}
                          required
                          disabled={invitation.accountExists}
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

                    {error ? (
                      <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
                    ) : null}

                    <button
                      type="submit"
                      disabled={busy || invitation.accountExists || fullName.trim().length === 0 || password.length < 8}
                      className="w-full rounded-full bg-[#0063fe] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {busy ? "Activation..." : "Créer mon compte et activer l'accès"}
                    </button>
                  </form>
                ) : (
                  <form className="space-y-4" onSubmit={handleLoginAndAccept}>
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                      <p className="font-medium text-slate-900">Connexion avec l'email invité</p>
                      <p className="mt-1">{invitation.email}</p>
                    </div>

                    <div className="block text-sm text-slate-700">
                      <span>Mot de passe du compte existant</span>
                      <div className="relative mt-1.5">
                        <input
                          className="w-full rounded-2xl border border-slate-300 pl-4 pr-10 py-3 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/20"
                          type={showExistingPassword ? "text" : "password"}
                          value={existingPassword}
                          onChange={(event) => setExistingPassword(event.target.value)}
                          minLength={8}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowExistingPassword((prev) => !prev)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                          aria-label={showExistingPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                        >
                          {showExistingPassword ? (
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
                      disabled={busy || existingPassword.length < 8}
                      className="w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {busy ? "Connexion..." : "Se connecter et activer mon accès"}
                    </button>
                  </form>
                )}
              </div>
            ) : null}

            {!loading && !invitation && error ? (
              <p className="mt-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}

export default function OwnerPortalInvitePage(): React.ReactElement {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 px-6 py-12">
          <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-semibold text-slate-950">Activation owner</h1>
            <LoadingPanel />
          </div>
        </main>
      }
    >
      <OwnerInviteContent />
    </Suspense>
  );
}
