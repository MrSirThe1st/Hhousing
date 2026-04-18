"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/auth-context";
import { createSupabaseBrowserClient } from "../lib/supabase/browser";
import LogoutButton from "./logout-button";

type ProfileFormState = {
  fullName: string;
  email: string;
  avatarUrl: string;
};

function resolveInitialState(user: ReturnType<typeof useAuth>["user"]): ProfileFormState {
  if (!user) {
    return {
      fullName: "",
      email: "",
      avatarUrl: ""
    };
  }

  const metadata = user.user_metadata;
  const fullName = (() => {
    if (metadata && typeof metadata === "object") {
      const value = "full_name" in metadata ? metadata.full_name : undefined;
      if (typeof value === "string") {
        return value;
      }
    }
    return "";
  })();

  const avatarUrl = (() => {
    if (metadata && typeof metadata === "object") {
      const value = "avatar_url" in metadata ? metadata.avatar_url : undefined;
      if (typeof value === "string") {
        return value;
      }
    }
    return "";
  })();

  return {
    fullName,
    email: user.email ?? "",
    avatarUrl
  };
}

function getInitials(value: string): string {
  const parts = value
    .split(" ")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 2);

  if (parts.length === 0) {
    return "OP";
  }

  return parts.map((item) => item[0]?.toUpperCase() ?? "").join("");
}

export default function OperatorProfilePanel(): React.ReactElement {
  const router = useRouter();
  const { user } = useAuth();
  const [form, setForm] = useState<ProfileFormState>(() => resolveInitialState(user));
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const avatarPreview = useMemo(() => {
    if (avatarFile) {
      return URL.createObjectURL(avatarFile);
    }
    return form.avatarUrl;
  }, [avatarFile, form.avatarUrl]);

  async function uploadAvatar(file: File): Promise<string> {
    if (!user) {
      throw new Error("Session introuvable.");
    }

    if (!file.type.startsWith("image/")) {
      throw new Error("La photo doit etre une image.");
    }

    const supabase = createSupabaseBrowserClient();
    const safeName = file.name.replace(/\s+/g, "-");
    const filePath = `users/${user.id}/avatar/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, file);
    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage.from("documents").getPublicUrl(filePath);
    return data.publicUrl;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!user) {
      setError("Session introuvable.");
      return;
    }

    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const nextAvatarUrl = avatarFile ? await uploadAvatar(avatarFile) : form.avatarUrl.trim();

      const updates: {
        email?: string;
        data: {
          full_name: string;
          avatar_url: string;
        };
      } = {
        data: {
          full_name: form.fullName.trim(),
          avatar_url: nextAvatarUrl
        }
      };

      if (form.email.trim() && form.email.trim() !== (user.email ?? "")) {
        updates.email = form.email.trim();
      }

      const { error: updateError } = await supabase.auth.updateUser(updates);
      if (updateError) {
        setError(updateError.message);
        setBusy(false);
        return;
      }

      setForm((current) => ({
        ...current,
        avatarUrl: nextAvatarUrl
      }));
      setAvatarFile(null);
      setMessage(updates.email ? "Profil mis a jour. Verifiez votre email pour confirmer la nouvelle adresse." : "Profil mis a jour.");
      setBusy(false);
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Mise a jour impossible.");
      setBusy(false);
    }
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Session introuvable. Reconnectez-vous.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#010a19]">Mon profil</h1>
          <p className="mt-2 text-sm text-slate-500">Informations personnelles de votre compte operateur.</p>
        </div>
        <LogoutButton />
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <section className="h-fit space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <h2 className="text-base font-semibold text-[#010a19]">Photo</h2>
            <p className="mt-1 text-sm text-slate-500">Visible dans l'entete de votre espace.</p>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Photo de profil" className="h-40 w-full bg-white object-cover" />
            ) : (
              <div className="flex h-40 items-center justify-center bg-[#0063fe] text-2xl font-semibold text-white">
                {getInitials(form.fullName || user.email || "")}
              </div>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            disabled={busy}
            onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15 disabled:bg-slate-100"
          />
        </section>

        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          {message ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
          {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm md:col-span-2">
              <span className="mb-1.5 block font-medium text-slate-700">Nom complet</span>
              <input
                value={form.fullName}
                onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                disabled={busy}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15 disabled:bg-slate-100"
                placeholder="Votre nom"
              />
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="mb-1.5 block font-medium text-slate-700">Adresse email</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                disabled={busy}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15 disabled:bg-slate-100"
              />
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="mb-1.5 block font-medium text-slate-700">ID utilisateur</span>
              <input
                value={user.id}
                disabled
                className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-500"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-[#0063fe] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0052d4] disabled:opacity-60"
          >
            {busy ? "Enregistrement..." : "Enregistrer"}
          </button>
        </section>
      </form>
    </div>
  );
}
