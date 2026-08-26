"use client";

import { useState } from "react";
import Link from "next/link";

type Status = "idle" | "loading" | "success" | "error";

export default function PublicDemoRequestForm(): React.ReactElement {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setStatus("loading");
    setErrorMessage(null);

    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      fullName: String(data.get("fullName") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      phone: String(data.get("phone") ?? "").trim(),
      company: String(data.get("company") ?? "").trim(),
      unitsCount: String(data.get("unitsCount") ?? "").trim(),
      message: String(data.get("message") ?? "").trim()
    };

    try {
      const response = await fetch("/api/demo-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !json.success) {
        setStatus("error");
        setErrorMessage(json.error ?? "Impossible d'envoyer la demande. Réessayez.");
        return;
      }
      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
      setErrorMessage("Erreur réseau. Vérifiez votre connexion et réessayez.");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-8 text-center">
        <p className="text-lg font-semibold text-emerald-900">Demande bien reçue</p>
        <p className="mt-2 text-sm text-emerald-800">
          Notre équipe vous recontacte rapidement pour planifier la démo.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-[#0063FE] px-5 text-sm font-semibold text-white transition hover:bg-[#0052d4]"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Nom complet
          <input
            name="fullName"
            required
            autoComplete="name"
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-[#0063FE] focus:ring-2 focus:ring-[#0063FE]/20"
            placeholder="Jean Mukendi"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          E-mail professionnel
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-[#0063FE] focus:ring-2 focus:ring-[#0063FE]/20"
            placeholder="vous@agence.com"
          />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Téléphone / WhatsApp
          <input
            name="phone"
            required
            autoComplete="tel"
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-[#0063FE] focus:ring-2 focus:ring-[#0063FE]/20"
            placeholder="+243 ..."
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Organisation (optionnel)
          <input
            name="company"
            autoComplete="organization"
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-[#0063FE] focus:ring-2 focus:ring-[#0063FE]/20"
            placeholder="Nom de l'agence ou du portefeuille"
          />
        </label>
      </div>
      <label className="block text-sm font-medium text-slate-700">
        Nombre approximatif de logements
        <select
          name="unitsCount"
          className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-[#0063FE] focus:ring-2 focus:ring-[#0063FE]/20"
          defaultValue="1-5"
        >
          <option value="1-5">1 à 5</option>
          <option value="6-20">6 à 20</option>
          <option value="21-50">21 à 50</option>
          <option value="50+">Plus de 50</option>
        </select>
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Message (optionnel)
        <textarea
          name="message"
          rows={3}
          className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-[#0063FE] focus:ring-2 focus:ring-[#0063FE]/20"
          placeholder="Parlez-nous brièvement de votre portefeuille ou de vos besoins."
        />
      </label>

      {status === "error" && errorMessage ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === "loading"}
        className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-[#0063FE] px-6 text-sm font-semibold text-white transition hover:bg-[#0052d4] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {status === "loading" ? "Envoi en cours…" : "Réserver ma démo"}
      </button>
      <p className="text-center text-xs text-slate-500">
        Gratuit · Sans engagement · Réponse sous 1 à 2 jours ouvrés
      </p>
    </form>
  );
}
