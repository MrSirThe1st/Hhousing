"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { TeamMemberInvitationPreview } from "@hhousing/api-contracts";
import { postPublic } from "../../lib/api-client";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";
import UniversalLoadingState from "../../components/universal-loading-state";

function TeamInvitePageContent(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [invitation, setInvitation] = useState<TeamMemberInvitationPreview | null>(null);
  const [mode, setMode] = useState<"create" | "login">("create");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [existingPassword, setExistingPassword] = useState("");
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
      const response = await fetch(`/api/auth/team-invitations/validate?token=${encodeURIComponent(token)}`);
      const payload = (await response.json()) as {
        success: boolean;
        data?: { invitation: TeamMemberInvitationPreview };
        error?: string;
      };

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

    const result = await postPublic<{ userId: string }>("/api/auth/team-invitations/accept", {
      token,
      fullName,
      password
    });

    if (!result.success) {
      setError(result.error);
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

    router.push("/dashboard");
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
      setError("Connexion impossible. Verifiez votre mot de passe.");
      setBusy(false);
      return;
    }

    const result = await postPublic<{ userId: string }>("/api/auth/team-invitations/accept", {
      token
    });

    if (!result.success) {
      setError(result.error);
      setBusy(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(0,99,254,0.10),_transparent_35%),linear-gradient(180deg,#f8fafc_0%,#eef3f8_100%)] px-6 py-12">
      <div className="mx-auto max-w-4xl rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_70px_-40px_rgba(15,23,42,0.35)]">
        <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="border-b border-slate-200 bg-slate-950 px-6 py-8 text-white lg:border-b-0 lg:border-r">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Invitation equipe</p>
            <h1 className="mt-3 text-3xl font-semibold">Activez votre acces personnel</h1>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              Chaque membre rejoint l'equipe avec son propre compte. Aucun mot de passe n'est partage avec le gestionnaire qui envoie l'invitation.
            </p>

            {invitation ? (
              <div className="mt-8 rounded-3xl bg-white/10 p-5 text-sm text-slate-200">
                <p><strong>Organisation:</strong> {invitation.organizationName}</p>
                <p className="mt-2"><strong>Email invite:</strong> {invitation.email}</p>
                <p className="mt-2"><strong>Expiration:</strong> {new Date(invitation.expiresAtIso).toLocaleDateString("fr-FR")}</p>
              </div>
            ) : null}

            <div className="mt-8 space-y-4 text-sm text-slate-300">
              <div className="rounded-3xl border border-white/10 px-4 py-4">
                <p className="font-semibold text-white">1. Verifiez votre email</p>
                <p className="mt-1">L'invitation est liee a l'adresse email exacte du membre invite.</p>
              </div>
              <div className="rounded-3xl border border-white/10 px-4 py-4">
                <p className="font-semibold text-white">2. Creez ou connectez votre compte</p>
                <p className="mt-1">Nouveau membre: creation de compte. Compte existant: connexion puis rattachement a l'organisation.</p>
              </div>
              <div className="rounded-3xl border border-white/10 px-4 py-4">
                <p className="font-semibold text-white">3. Accedez a la plateforme</p>
                <p className="mt-1">Votre acces devient individuel, traçable et securise.</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-8">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Activation</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">Finaliser l'invitation</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {invitation?.accountExists
                ? "Un compte Hhousing existe deja pour cet email. Connectez-vous avec ce compte pour rejoindre l'organisation."
                : "Aucun compte Hhousing n'existe encore pour cet email. Creez votre acces puis activez l'invitation."}
            </p>

import UniversalLoadingState from "../../components/universal-loading-state";
            {loading ? <UniversalLoadingState minHeightClassName="min-h-28" size="compact" className="mt-6" /> : null}

            {!loading && invitation ? (
              <div className="mt-6 space-y-5">
                <div className="inline-flex rounded-full bg-slate-100 p-1 text-sm">
                  <button
                    type="button"
                    onClick={() => setMode("create")}
                    disabled={invitation.accountExists}
                    className={`rounded-full px-4 py-2 font-medium transition ${mode === "create" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"} ${invitation.accountExists ? "cursor-not-allowed opacity-40" : ""}`}
                  >
                    Creer un compte
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

                    <label className="block text-sm text-slate-700">
                      Mot de passe
                      <input
                        className="mt-1.5 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/20"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        minLength={8}
                        required
                        disabled={invitation.accountExists}
                      />
                    </label>

                    <label className="block text-sm text-slate-700">
                      Confirmer le mot de passe
                      <input
                        className="mt-1.5 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/20"
                        type="password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        minLength={8}
                        required
                        disabled={invitation.accountExists}
                      />
                    </label>

                    {invitation.accountExists ? (
                      <p className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                        Un compte existe deja pour cet email. Utilisez l'onglet de connexion.
                      </p>
                    ) : null}

                    {error ? (
                      <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
                    ) : null}

                    <button
                      type="submit"
                      disabled={busy || invitation.accountExists || fullName.trim().length === 0 || password.length < 8}
                      className="w-full rounded-full bg-[#0063fe] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {busy ? "Activation..." : "Creer mon compte et activer l'acces"}
                    </button>
                  </form>
                ) : (
                  <form className="space-y-4" onSubmit={handleLoginAndAccept}>
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                      <p className="font-medium text-slate-900">Connexion avec votre email invite</p>
                      <p className="mt-1">{invitation.email}</p>
                    </div>

                    <label className="block text-sm text-slate-700">
                      Mot de passe du compte existant
                      <input
                        className="mt-1.5 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/20"
                        type="password"
                        value={existingPassword}
                        onChange={(event) => setExistingPassword(event.target.value)}
                        minLength={8}
                        required
                      />
                    </label>

                    {error ? (
                      <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
                    ) : null}

                    <button
                      type="submit"
                      disabled={busy || existingPassword.length < 8}
                      className="w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {busy ? "Connexion..." : "Se connecter et rejoindre l'organisation"}
                    </button>
                  </form>
                )}
              </div>
            ) : null}

            {!loading && !invitation && error ? (
              <p className="mt-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}

function TeamInviteFallback(): React.ReactElement {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-950">Activation de votre acces</h1>
        <UniversalLoadingState minHeightClassName="min-h-28" size="compact" className="mt-6" />
      </div>
    </main>
  );
}

export default function TeamInvitePage(): React.ReactElement {
  return (
    <Suspense fallback={<TeamInviteFallback />}>
      <TeamInvitePageContent />
    </Suspense>
  );
}