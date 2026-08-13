"use client";

import { useEffect, useState } from "react";

type ProfileData = {
  profile: {
    fullName: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  preferences: {
    emailNewListings: boolean;
    emailHarakaNews: boolean;
  } | null;
};

export default function AccountProfilePage(): React.ReactElement {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [emailNewListings, setEmailNewListings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        const response = await fetch("/api/marketplace/profile", { credentials: "include" });
        const body = (await response.json()) as { success?: boolean; data?: ProfileData };
        if (response.ok && body.data) {
          setFullName(body.data.profile?.fullName ?? "");
          setPhone(body.data.profile?.phone ?? "");
          setEmail(body.data.profile?.email ?? "");
          setEmailNewListings(Boolean(body.data.preferences?.emailNewListings));
        }
      } catch {
        setError("Impossible de charger le profil.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/marketplace/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          phone,
          email,
          emailNewListings,
          emailHarakaNews: emailNewListings
        })
      });
      if (!response.ok) {
        setError("Enregistrement impossible.");
        return;
      }
      setMessage("Profil mis à jour.");
    } catch {
      setError("Erreur réseau.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Chargement…</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-black text-slate-900">Mon profil</h2>
        <p className="mt-1 text-sm text-slate-600">Informations utilisées pour vos candidatures et contacts.</p>
      </div>

      <label className="block text-sm font-medium text-slate-700">
        Nom complet
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5"
        />
      </label>

      <label className="block text-sm font-medium text-slate-700">
        E-mail
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5"
        />
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Téléphone
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5"
        />
      </label>

      <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={emailNewListings}
          onChange={(e) => setEmailNewListings(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          <span className="font-semibold">Recevez les nouveaux logements</span>
          <span className="mt-0.5 block text-slate-500">
            Recevoir par e-mail les nouveaux logements et actualités Haraka.
          </span>
        </span>
      </label>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-[#0063FE] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0052d4] disabled:opacity-60"
      >
        {saving ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
