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
      Verification de l'invitation...
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
      const response = await fetch(`/api/auth/owner-invitations/validate?token=${encodeURIComponent(token)}`);
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

    const response = await fetch("/api/auth/owner-invitations/accept", {
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

    const response = await fetch("/api/auth/owner-invitations/accept", {
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

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(0,99,254,0.10),transparent_35%),linear-gradient(180deg,#f8fafc_0%,#eef3f8_100%)] px-6 py-12">
      <div className="mx-auto max-w-5xl rounded-4xl border border-slate-200 bg-white shadow-[0_24px_70px_-40px_rgba(15,23,42,0.35)]">
        <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="border-b border-slate-200 bg-slate-950 px-6 py-8 text-white lg:border-b-0 lg:border-r">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Invitation owner</p>
            <h1 className="mt-3 text-3xl font-semibold">Activez votre acces lecture seule</h1>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              Votre acces owner reste strictement consultatif. Vous pourrez suivre vos biens,
              les paiements et les rapports lies a votre portefeuille, sans modifier les donnees.
            </p>

            {invitation ? (
              <div className="mt-8 rounded-3xl bg-white/10 p-5 text-sm text-slate-200">
                <p><strong>Owner:</strong> {invitation.ownerName}</p>
                <p className="mt-2"><strong>Organisation:</strong> {invitation.organizationName}</p>
                <p className="mt-2"><strong>Email invite:</strong> {invitation.email}</p>
                <p className="mt-2"><strong>Expiration:</strong> {new Date(invitation.expiresAtIso).toLocaleDateString("fr-FR")}</p>
              </div>
            ) : null}
          </section>

          <section className="px-6 py-8">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Activation</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">Finaliser l'invitation</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {invitation?.accountExists
                ? "Un compte Hhousing existe deja pour cet email. Connectez-vous avec ce compte, puis activez votre acces owner." 
                : "Aucun compte Hhousing n'existe encore pour cet email. Creez votre mot de passe puis activez votre acces owner."}
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
                      <p className="font-medium text-slate-900">Connexion avec l'email invite</p>
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
                      {busy ? "Connexion..." : "Se connecter et activer mon acces"}
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

export default function OwnerInvitePage(): React.ReactElement {
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