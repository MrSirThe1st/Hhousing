"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { TeamMemberInvitationPreview } from "@hhousing/api-contracts";
import { postPublic } from "../../lib/api-client";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";

function TeamInvitePageContent(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [invitation, setInvitation] = useState<TeamMemberInvitationPreview | null>(null);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
      setLoading(false);
    }

    void loadPreview();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
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

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-950">Activation de votre acces</h1>
        <p className="mt-2 text-sm text-slate-600">
          Finalisez votre invitation equipe pour rejoindre votre organisation sur Hhousing.
        </p>

        {loading ? <p className="mt-6 text-sm text-slate-500">Chargement...</p> : null}

        {!loading && invitation ? (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p><strong>Organisation:</strong> {invitation.organizationName}</p>
              <p><strong>Email:</strong> {invitation.email}</p>
            </div>

            <label className="block text-sm text-slate-700">
              Nom complet
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            </label>

            <label className="block text-sm text-slate-700">
              Mot de passe
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
              />
            </label>

            <label className="block text-sm text-slate-700">
              Confirmer le mot de passe
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={8}
                required
              />
            </label>

            {error ? (
              <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={busy || fullName.trim().length === 0 || password.length < 8}
              className="w-full rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {busy ? "Activation..." : "Activer mon acces"}
            </button>
          </form>
        ) : null}

        {!loading && !invitation && error ? (
          <p className="mt-6 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        ) : null}
      </div>
    </main>
  );
}

function TeamInviteFallback(): React.ReactElement {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-950">Activation de votre acces</h1>
        <p className="mt-6 text-sm text-slate-500">Chargement...</p>
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